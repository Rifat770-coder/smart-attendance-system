import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.core.database import get_db
from app.api.v1.deps import (
    get_current_user,
    require_teacher,
    require_student,
    get_redis,
)
from app.models.user import User
from app.schemas.attendance import (
    DynamicQRChallengeResponse,
    ScanAttendanceRequest,
    AttendanceRecordResponse,
)
from app.services.qr_service import QRService

router = APIRouter()


@router.get("/sessions/{session_id}/challenge", response_model=DynamicQRChallengeResponse)
async def get_or_rotate_challenge(
    session_id: uuid.UUID,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """
    Teacher polls or requests the active/rotated QR challenge.
    Rotates challenge every interval (e.g. 10s) and persists in Redis with TTL.
    """
    teacher = current_user.teacher_profile
    if not teacher and "SUPER_ADMIN" not in current_user.roles_list:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty teachers can generate session QR challenges.",
        )

    teacher_id = teacher.id if teacher else current_user.id
    challenge_dict = await QRService.generate_rotating_challenge(
        db=db,
        redis=redis,
        session_id=session_id,
        teacher_id=teacher_id,
    )
    return challenge_dict


@router.post("/scan", response_model=AttendanceRecordResponse)
async def scan_qr_challenge(
    req: ScanAttendanceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """
    Enrolled student submits the scanned QR challenge token.
    Validates:
      1. Student authentication
      2. Student enrollment in this session's section
      3. Authoritative session state in PostgreSQL (ACTIVE only)
      4. Challenge validity & non-expiry in Redis
      5. Duplicate prevention via unique constraint
    Inserts record transactionally and pushes real-time WebSocket update to Teacher dashboard.
    """
    if "STUDENT" not in current_user.roles_list or not current_user.student_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only enrolled students are authorized to scan QR codes for attendance.",
        )

    rec = await QRService.verify_and_mark_attendance(
        db=db,
        redis=redis,
        student_user=current_user,
        session_id=req.session_id,
        challenge_token=req.challenge_token,
        client_timestamp=req.client_timestamp,
    )

    student = current_user.student_profile
    return AttendanceRecordResponse(
        id=rec.id,
        session_id=rec.session_id,
        student_id=rec.student_id,
        student_name=current_user.full_name,
        student_id_number=student.student_id_number,
        status=rec.status,
        verification_method=rec.verification_method,
        verified_at=rec.verified_at,
    )
