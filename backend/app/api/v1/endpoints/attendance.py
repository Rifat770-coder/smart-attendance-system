import uuid
import datetime as dt
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.core.database import get_db
from app.api.v1.deps import (
    get_current_user,
    require_teacher,
    require_student,
    get_redis,
)
from app.models.attendance import AttendanceSession, AttendanceRecord
from app.models.academic import CourseSection, Course, TeacherAssignment, Enrollment
from app.models.user import User, Student, Teacher, AuditLog
from app.schemas.attendance import (
    AttendanceSessionCreate,
    AttendanceSessionResponse,
    AttendanceSessionStateUpdate,
    AttendanceRecordResponse,
    ManualAttendanceRecordCreate,
)
from app.services.attendance_service import AttendanceService

router = APIRouter()


@router.post("/sessions", response_model=AttendanceSessionResponse)
async def create_attendance_session(
    req: AttendanceSessionCreate,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """
    Teacher creates an attendance session for an assigned course section.
    Automatically sets state to ACTIVE so rotating QR challenge generation begins.
    """
    teacher = current_user.teacher_profile
    if not teacher and "SUPER_ADMIN" not in current_user.roles_list:
        raise HTTPException(status_code=403, detail="Only faculty teachers can start attendance sessions.")

    # Verify section exists and belongs to teacher (unless Super Admin)
    sec_stmt = (
        select(CourseSection)
        .options(
            selectinload(CourseSection.course),
            selectinload(CourseSection.enrollments),
        )
        .where(CourseSection.id == req.section_id)
    )
    res = await db.execute(sec_stmt)
    section = res.scalars().first()
    if not section:
        raise HTTPException(status_code=404, detail="Course section not found.")

    if teacher:
        assign_stmt = select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == teacher.id,
            TeacherAssignment.section_id == req.section_id,
        )
        if not (await db.execute(assign_stmt)).scalars().first() and "SUPER_ADMIN" not in current_user.roles_list:
            raise HTTPException(status_code=403, detail="You are not assigned to instruct this section.")

    now = dt.datetime.now(dt.timezone.utc)
    session_date = req.session_date or dt.date.today()
    start_time = req.start_time or now.time()
    # Default end time + 1 hour
    end_time = req.end_time or (now + dt.timedelta(hours=1)).time()

    teacher_id = teacher.id if teacher else section.teacher_assignments[0].teacher_id

    att_session = AttendanceSession(
        section_id=req.section_id,
        teacher_id=teacher_id,
        title=req.title.strip(),
        session_date=session_date,
        start_time=start_time,
        end_time=end_time,
        state="ACTIVE",  # Immediately ACTIVE for class
        rotation_interval_seconds=req.rotation_interval_seconds,
        started_at=now,
        notes=req.notes,
    )
    db.add(att_session)

    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_SESSION",
        entity_type="attendance_sessions",
        diff={"title": req.title, "section_id": str(req.section_id), "state": "ACTIVE"},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(att_session)

    return AttendanceSessionResponse(
        id=att_session.id,
        section_id=att_session.section_id,
        teacher_id=att_session.teacher_id,
        title=att_session.title,
        session_date=att_session.session_date,
        start_time=att_session.start_time,
        end_time=att_session.end_time,
        state=att_session.state,
        rotation_interval_seconds=att_session.rotation_interval_seconds,
        started_at=att_session.started_at,
        course_name=section.course.name if section.course else None,
        course_code=section.course.code if section.course else None,
        section_name=section.section_name,
        teacher_name=current_user.full_name,
        enrolled_count=len(section.enrollments),
        present_count=0,
        late_count=0,
        absent_count=len(section.enrollments),
        excused_count=0,
    )


@router.get("/sessions", response_model=List[AttendanceSessionResponse])
async def list_attendance_sessions(
    section_id: Optional[uuid.UUID] = Query(None),
    state: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List attendance sessions scoped to user role."""
    stmt = (
        select(AttendanceSession)
        .options(
            selectinload(AttendanceSession.section).selectinload(CourseSection.course),
            selectinload(AttendanceSession.section).selectinload(CourseSection.enrollments),
            selectinload(AttendanceSession.teacher).selectinload(Teacher.user),
            selectinload(AttendanceSession.records),
        )
        .order_by(AttendanceSession.created_at.desc())
    )

    roles = current_user.roles_list
    if "TEACHER" in roles and "DEPT_ADMIN" not in roles and "SUPER_ADMIN" not in roles:
        if current_user.teacher_profile:
            stmt = stmt.where(AttendanceSession.teacher_id == current_user.teacher_profile.id)
    elif "STUDENT" in roles and "TEACHER" not in roles and "DEPT_ADMIN" not in roles and "SUPER_ADMIN" not in roles:
        if current_user.student_profile:
            # Enrolled sections
            stmt = stmt.join(Enrollment, Enrollment.section_id == AttendanceSession.section_id).where(
                Enrollment.student_id == current_user.student_profile.id
            )

    if section_id:
        stmt = stmt.where(AttendanceSession.section_id == section_id)
    if state:
        stmt = stmt.where(AttendanceSession.state == state.upper())

    res = await db.execute(stmt)
    sessions = res.scalars().unique().all()

    result = []
    for s in sessions:
        present = sum(1 for r in s.records if r.status == "PRESENT")
        late = sum(1 for r in s.records if r.status == "LATE")
        excused = sum(1 for r in s.records if r.status == "EXCUSED")
        enrolled = len(s.section.enrollments) if s.section else 0
        absent = max(0, enrolled - (present + late + excused))

        result.append(
            AttendanceSessionResponse(
                id=s.id,
                section_id=s.section_id,
                teacher_id=s.teacher_id,
                title=s.title,
                session_date=s.session_date,
                start_time=s.start_time,
                end_time=s.end_time,
                state=s.state,
                rotation_interval_seconds=s.rotation_interval_seconds,
                started_at=s.started_at,
                ended_at=s.ended_at,
                course_name=s.section.course.name if s.section and s.section.course else None,
                course_code=s.section.course.code if s.section and s.section.course else None,
                section_name=s.section.section_name if s.section else None,
                teacher_name=s.teacher.user.full_name if s.teacher and s.teacher.user else None,
                enrolled_count=enrolled,
                present_count=present,
                late_count=late,
                absent_count=absent,
                excused_count=excused,
            )
        )
    return result


@router.get("/sessions/{session_id}", response_model=AttendanceSessionResponse)
async def get_attendance_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single session with live counters."""
    stmt = (
        select(AttendanceSession)
        .options(
            selectinload(AttendanceSession.section).selectinload(CourseSection.course),
            selectinload(AttendanceSession.section).selectinload(CourseSection.enrollments),
            selectinload(AttendanceSession.teacher).selectinload(Teacher.user),
            selectinload(AttendanceSession.records),
        )
        .where(AttendanceSession.id == session_id)
    )
    res = await db.execute(stmt)
    s = res.scalars().first()
    if not s:
        raise HTTPException(status_code=404, detail="Attendance session not found.")

    present = sum(1 for r in s.records if r.status == "PRESENT")
    late = sum(1 for r in s.records if r.status == "LATE")
    excused = sum(1 for r in s.records if r.status == "EXCUSED")
    enrolled = len(s.section.enrollments) if s.section else 0
    absent = max(0, enrolled - (present + late + excused))

    return AttendanceSessionResponse(
        id=s.id,
        section_id=s.section_id,
        teacher_id=s.teacher_id,
        title=s.title,
        session_date=s.session_date,
        start_time=s.start_time,
        end_time=s.end_time,
        state=s.state,
        rotation_interval_seconds=s.rotation_interval_seconds,
        started_at=s.started_at,
        ended_at=s.ended_at,
        course_name=s.section.course.name if s.section and s.section.course else None,
        course_code=s.section.course.code if s.section and s.section.course else None,
        section_name=s.section.section_name if s.section else None,
        teacher_name=s.teacher.user.full_name if s.teacher and s.teacher.user else None,
        enrolled_count=enrolled,
        present_count=present,
        late_count=late,
        absent_count=absent,
        excused_count=excused,
    )


@router.patch("/sessions/{session_id}/state", response_model=AttendanceSessionResponse)
async def update_session_state(
    session_id: uuid.UUID,
    req: AttendanceSessionStateUpdate,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """
    Transition session state:
    SCHEDULED -> ACTIVE, ACTIVE -> PAUSED, PAUSED -> ACTIVE, ACTIVE/PAUSED -> COMPLETED, SCHEDULED -> CANCELLED.
    Ending session immediately invalidates attendance submissions.
    """
    s = await AttendanceService.transition_session_state(
        db=db,
        session_id=session_id,
        new_state=req.state,
        user=current_user,
        redis=redis,
    )
    return await get_attendance_session(session_id=s.id, current_user=current_user, db=db)


@router.get("/sessions/{session_id}/records", response_model=List[AttendanceRecordResponse])
async def list_session_records(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List student attendance records for a session."""
    stmt = (
        select(AttendanceRecord)
        .options(
            selectinload(AttendanceRecord.student).selectinload(Student.user),
        )
        .where(AttendanceRecord.session_id == session_id)
        .order_by(AttendanceRecord.verified_at.desc())
    )
    res = await db.execute(stmt)
    records = res.scalars().all()

    return [
        AttendanceRecordResponse(
            id=r.id,
            session_id=r.session_id,
            student_id=r.student_id,
            student_name=r.student.user.full_name if r.student and r.student.user else "Unknown",
            student_id_number=r.student.student_id_number if r.student else "Unknown",
            status=r.status,
            verification_method=r.verification_method,
            verified_at=r.verified_at,
        )
        for r in records
    ]


@router.post("/sessions/{session_id}/manual-record", response_model=AttendanceRecordResponse)
async def create_manual_record(
    session_id: uuid.UUID,
    req: ManualAttendanceRecordCreate,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """Teacher manually marks attendance for a student with justification and audit trail."""
    now = dt.datetime.now(dt.timezone.utc)
    
    # Check if record already exists
    existing_stmt = select(AttendanceRecord).where(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.student_id == req.student_id,
    )
    rec = (await db.execute(existing_stmt)).scalars().first()

    if rec:
        old_status = rec.status
        rec.status = req.status
        rec.verification_method = "MANUAL"
        rec.verified_at = now
        rec.metadata_info = {"justification": req.justification, "marked_by": str(current_user.id)}
    else:
        old_status = "ABSENT"
        rec = AttendanceRecord(
            session_id=session_id,
            student_id=req.student_id,
            status=req.status,
            verification_method="MANUAL",
            verified_at=now,
            metadata_info={"justification": req.justification, "marked_by": str(current_user.id)},
        )
        db.add(rec)

    audit = AuditLog(
        user_id=current_user.id,
        action="MANUAL_ATTENDANCE_OVERRIDE",
        entity_type="attendance_records",
        diff={
            "student_id": str(req.student_id),
            "session_id": str(session_id),
            "old_status": old_status,
            "new_status": req.status,
            "justification": req.justification,
        },
    )
    db.add(audit)

    await db.commit()
    await db.refresh(rec)

    student = await db.get(Student, req.student_id)
    student_user = await db.get(User, student.user_id) if student else None

    return AttendanceRecordResponse(
        id=rec.id,
        session_id=rec.session_id,
        student_id=rec.student_id,
        student_name=student_user.full_name if student_user else "Unknown",
        student_id_number=student.student_id_number if student else "Unknown",
        status=rec.status,
        verification_method=rec.verification_method,
        verified_at=rec.verified_at,
    )
