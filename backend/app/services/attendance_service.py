import uuid
import json
import datetime as dt
from typing import List, Optional, Tuple, Dict
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
import redis.asyncio as aioredis

import app.models
from app.models.attendance import (
    AttendanceSession,
    AttendanceRecord,
    AttendancePolicy,
    AttendanceCorrection,
)
from app.models.academic import CourseSection, Course, Enrollment, TeacherAssignment
from app.models.user import Student, User, AuditLog
from app.schemas.attendance import CourseAttendanceStats, StudentAttendanceSummary

VALID_STATE_TRANSITIONS: Dict[str, List[str]] = {
    "SCHEDULED": ["ACTIVE", "CANCELLED"],
    "ACTIVE": ["PAUSED", "COMPLETED"],
    "PAUSED": ["ACTIVE", "COMPLETED"],
    "COMPLETED": [],  # Terminal state
    "CANCELLED": [],  # Terminal state
}


class AttendanceService:
    @staticmethod
    async def transition_session_state(
        db: AsyncSession,
        session_id: uuid.UUID,
        new_state: str,
        user: User,
        redis: Optional[aioredis.Redis] = None,
    ) -> AttendanceSession:
        """
        Transition attendance session state according to the formal state machine.
        Enforces authoritativeness, prevents race conditions, and notifies via Redis.
        """
        new_state = new_state.upper()
        stmt = (
            select(AttendanceSession)
            .options(
                selectinload(AttendanceSession.section).selectinload(CourseSection.course),
                selectinload(AttendanceSession.teacher),
            )
            .where(AttendanceSession.id == session_id)
            .with_for_update()  # Row lock for race condition prevention
        )
        res = await db.execute(stmt)
        att_session = res.scalars().first()

        if not att_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance session not found.",
            )

        current_state = att_session.state
        allowed_targets = VALID_STATE_TRANSITIONS.get(current_state, [])

        if new_state not in allowed_targets:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid session state transition from '{current_state}' to '{new_state}'. Allowed transitions: {allowed_targets}",
            )

        now = dt.datetime.now(dt.timezone.utc)
        att_session.state = new_state
        if new_state == "ACTIVE" and not att_session.started_at:
            att_session.started_at = now
        elif new_state in ("COMPLETED", "CANCELLED"):
            att_session.ended_at = now

        # Audit log entry
        audit = AuditLog(
            user_id=user.id,
            action="SESSION_STATE_TRANSITION",
            entity_type="attendance_sessions",
            entity_id=str(session_id),
            diff={"from_state": current_state, "to_state": new_state},
        )
        db.add(audit)

        await db.commit()
        await db.refresh(att_session)

        # Notify active clients via Redis Pub/Sub
        if redis:
            payload = {
                "event": "SESSION_STATE_CHANGED",
                "session_id": str(session_id),
                "state": new_state,
                "timestamp": now.isoformat(),
            }
            await redis.publish(f"ws:session:{session_id}:events", json.dumps(payload))

        return att_session

    @staticmethod
    async def calculate_student_attendance(
        db: AsyncSession,
        student_id: uuid.UUID,
    ) -> StudentAttendanceSummary:
        """
        Calculate mathematically correct attendance percentages for a student across all enrolled sections.
        Denominator = strictly completed eligible sessions for each section.
        """
        # Load student and enrollments
        student_stmt = (
            select(Student)
            .options(
                selectinload(Student.user),
                selectinload(Student.department).selectinload(app.models.Department.attendance_policies),
                selectinload(Student.enrollments).selectinload(Enrollment.section).selectinload(CourseSection.course),
            )
            .where(Student.id == student_id)
        )
        res = await db.execute(student_stmt)
        student = res.scalars().first()

        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found.")

        # Default policy
        min_policy = 75.0
        late_weight = 0.5
        if student.department and student.department.attendance_policies:
            policy = student.department.attendance_policies[0]
            min_policy = policy.minimum_percentage
            late_weight = policy.late_weight

        course_stats: List[CourseAttendanceStats] = []
        total_eligible = 0
        total_present = 0
        total_late = 0
        total_absent = 0
        total_excused = 0

        for enrollment in student.enrollments:
            section = enrollment.section
            if not section:
                continue
            course = section.course

            # Count completed sessions for this section
            completed_sessions_stmt = select(func.count(AttendanceSession.id)).where(
                AttendanceSession.section_id == section.id,
                AttendanceSession.state == "COMPLETED",
            )
            eligible_count = (await db.execute(completed_sessions_stmt)).scalar() or 0

            # Count student's records for completed sessions in this section
            records_stmt = (
                select(AttendanceRecord.status, func.count(AttendanceRecord.id))
                .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
                .where(
                    AttendanceRecord.student_id == student_id,
                    AttendanceSession.section_id == section.id,
                    AttendanceSession.state == "COMPLETED",
                )
                .group_by(AttendanceRecord.status)
            )
            status_counts = dict((await db.execute(records_stmt)).all())

            present = status_counts.get("PRESENT", 0)
            late = status_counts.get("LATE", 0)
            excused = status_counts.get("EXCUSED", 0)
            recorded_absent = status_counts.get("ABSENT", 0)
            
            # An enrolled student who missed marking is also ABSENT
            unrecorded_missed = max(0, eligible_count - (present + late + excused + recorded_absent))
            absent = recorded_absent + unrecorded_missed

            # Calculate mathematically correct percentage
            if eligible_count > 0:
                weighted_score = present + (late * late_weight) + excused
                pct = round((weighted_score / eligible_count) * 100.0, 2)
                pct = min(100.0, max(0.0, pct))
            else:
                pct = 100.0  # No sessions held yet

            is_low = pct < min_policy and eligible_count > 0

            course_stats.append(
                CourseAttendanceStats(
                    course_id=course.id,
                    course_code=course.code,
                    course_name=course.name,
                    section_id=section.id,
                    section_name=section.section_name,
                    eligible_sessions=eligible_count,
                    present_sessions=present,
                    late_sessions=late,
                    absent_sessions=absent,
                    excused_sessions=excused,
                    attendance_percentage=pct,
                    is_low_attendance=is_low,
                    policy_minimum=min_policy,
                )
            )

            total_eligible += eligible_count
            total_present += present
            total_late += late
            total_absent += absent
            total_excused += excused

        # Calculate overall attendance percentage
        if total_eligible > 0:
            overall_score = total_present + (total_late * late_weight) + total_excused
            overall_pct = round((overall_score / total_eligible) * 100.0, 2)
            overall_pct = min(100.0, max(0.0, overall_pct))
        else:
            overall_pct = 100.0

        return StudentAttendanceSummary(
            student_id=student.id,
            student_name=student.user.full_name,
            student_id_number=student.student_id_number,
            overall_percentage=overall_pct,
            total_eligible_sessions=total_eligible,
            total_present=total_present,
            total_late=total_late,
            total_absent=total_absent,
            total_excused=total_excused,
            course_stats=course_stats,
        )
