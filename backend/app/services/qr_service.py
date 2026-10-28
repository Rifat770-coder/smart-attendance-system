import uuid
import json
import secrets
from datetime import datetime, timezone, timedelta
from typing import Tuple, Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
import redis.asyncio as aioredis

from app.core.config import settings
from app.core.security import generate_qr_challenge
from app.models.attendance import (
    AttendanceSession,
    AttendanceRecord,
    AttendancePolicy,
)
from app.models.academic import Enrollment, CourseSection, TeacherAssignment
from app.models.user import Student, Teacher, User


class QRService:
    @staticmethod
    async def generate_rotating_challenge(
        db: AsyncSession,
        redis: aioredis.Redis,
        session_id: uuid.UUID,
        teacher_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Generate a new cryptographically random challenge for an active attendance session.
        Stores challenge in Redis with TTL = rotation_interval + grace_period.
        Rotates challenge token while maintaining authoritative state in PostgreSQL.
        """
        # 1. Authoritative check in PostgreSQL
        stmt = select(AttendanceSession).where(
            AttendanceSession.id == session_id,
            AttendanceSession.teacher_id == teacher_id,
        )
        res = await db.execute(stmt)
        att_session = res.scalars().first()

        if not att_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance session not found or you are not the assigned teacher.",
            )

        if att_session.state != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot generate QR code: session is in '{att_session.state}' state. Only ACTIVE sessions generate QR codes.",
            )

        # 2. Increment sequence counter in Redis
        seq_key = f"session:{session_id}:qr_seq"
        sequence = await redis.incr(seq_key)

        # 3. Cryptographically generate challenge
        challenge_token, qr_payload = generate_qr_challenge(str(session_id), sequence)
        rotation_interval = att_session.rotation_interval_seconds
        ttl_seconds = rotation_interval + settings.QR_GRACE_PERIOD_SECONDS

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=rotation_interval)

        # 4. Store challenge metadata in Redis
        challenge_data = {
            "session_id": str(session_id),
            "sequence": sequence,
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "rotation_interval": rotation_interval,
        }
        await redis.setex(
            f"challenge:{challenge_token}",
            ttl_seconds,
            json.dumps(challenge_data),
        )

        # Set latest challenge reference for the session
        await redis.setex(
            f"session:{session_id}:current_challenge",
            ttl_seconds,
            challenge_token,
        )

        return {
            "session_id": session_id,
            "challenge_token": challenge_token,
            "sequence": sequence,
            "expires_in_seconds": rotation_interval,
            "qr_payload": qr_payload,
            "is_active": True,
        }

    @staticmethod
    async def verify_and_mark_attendance(
        db: AsyncSession,
        redis: aioredis.Redis,
        student_user: User,
        session_id: uuid.UUID,
        challenge_token: str,
        client_timestamp: Optional[datetime] = None,
    ) -> AttendanceRecord:
        """
        Validate student QR scan submission and record attendance with transactional guarantees.
        """
        # 1. Verify student profile
        student = student_user.student_profile
        if not student:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only enrolled students can mark attendance.",
            )

        # 2. Authoritative PostgreSQL session check
        session_stmt = (
            select(AttendanceSession)
            .options(
                selectinload(AttendanceSession.section).selectinload(CourseSection.course),
            )
            .where(AttendanceSession.id == session_id)
        )
        res = await db.execute(session_stmt)
        att_session = res.scalars().first()

        if not att_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance session does not exist.",
            )

        if att_session.state != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Attendance rejected: Session is '{att_session.state}'. Only ACTIVE sessions accept attendance.",
            )

        # 3. Verify student enrollment in section
        enrollment_stmt = select(Enrollment).where(
            Enrollment.student_id == student.id,
            Enrollment.section_id == att_session.section_id,
            Enrollment.status == "ACTIVE",
        )
        enrollment = (await db.execute(enrollment_stmt)).scalars().first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Attendance rejected: You are not enrolled in this course section.",
            )

        # 4. Verify Challenge in Redis
        challenge_raw = await redis.get(f"challenge:{challenge_token}")
        if not challenge_raw:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired QR challenge. Please scan the current code displayed on screen.",
            )

        challenge_data = json.loads(challenge_raw)
        if challenge_data.get("session_id") != str(session_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="QR challenge does not belong to this attendance session.",
            )

        # 5. Check if attendance already recorded (idempotency & duplicate check)
        existing_stmt = select(AttendanceRecord).where(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.student_id == student.id,
        )
        existing_record = (await db.execute(existing_stmt)).scalars().first()
        if existing_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attendance already submitted for this session. Duplicate submissions are not allowed.",
            )

        # 6. Check policy for LATE status
        now = datetime.now(timezone.utc)
        record_status = "PRESENT"
        if att_session.started_at:
            elapsed_minutes = (now - att_session.started_at).total_seconds() / 60.0
            # Get department policy if available
            policy_stmt = select(AttendancePolicy).where(
                AttendancePolicy.department_id == att_session.section.course.department_id
            )
            policy = (await db.execute(policy_stmt)).scalars().first()
            allowed_late = policy.allowed_late_minutes if policy else settings.DEFAULT_ALLOWED_LATE_MINUTES
            if elapsed_minutes > allowed_late:
                record_status = "LATE"

        # 7. Insert Attendance Record transactionally
        new_record = AttendanceRecord(
            session_id=session_id,
            student_id=student.id,
            status=record_status,
            verification_method="DYNAMIC_QR",
            verified_at=now,
            metadata_info={
                "challenge_seq": challenge_data.get("sequence"),
                "student_email": student_user.email,
                "marked_at": now.isoformat(),
            },
        )
        db.add(new_record)

        try:
            await db.commit()
            await db.refresh(new_record)
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attendance already recorded for this session.",
            )

        # 8. Publish real-time event to Redis for Teacher WebSocket
        event_payload = {
            "event": "STUDENT_ATTENDANCE_MARKED",
            "session_id": str(session_id),
            "record": {
                "id": str(new_record.id),
                "student_id": str(student.id),
                "student_name": student_user.full_name,
                "student_id_number": student.student_id_number,
                "status": record_status,
                "verified_at": now.isoformat(),
                "verification_method": "DYNAMIC_QR",
            },
        }
        await redis.publish(f"ws:session:{session_id}:events", json.dumps(event_payload))

        return new_record
