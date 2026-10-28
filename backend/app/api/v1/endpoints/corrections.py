import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import get_current_user, require_teacher, require_dept_admin
from app.models.attendance import AttendanceCorrection, AttendanceRecord, AttendanceSession
from app.models.academic import CourseSection, Course
from app.models.user import User, Student, AuditLog
from app.schemas.attendance import (
    AttendanceCorrectionCreate,
    AttendanceCorrectionReview,
    AttendanceCorrectionResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter()


@router.post("", response_model=AttendanceCorrectionResponse)
async def request_correction(
    req: AttendanceCorrectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Student submits an attendance correction request with a valid reason."""
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=403, detail="Only enrolled students can submit correction requests.")

    # Load record and verify it belongs to this student
    record = await db.get(AttendanceRecord, req.record_id)
    if not record or record.student_id != student.id:
        raise HTTPException(status_code=404, detail="Attendance record not found.")

    # Check for pending correction for this record
    pending_stmt = select(AttendanceCorrection).where(
        AttendanceCorrection.record_id == req.record_id,
        AttendanceCorrection.status == "PENDING",
    )
    if (await db.execute(pending_stmt)).scalars().first():
        raise HTTPException(
            status_code=400,
            detail="A correction request is already pending review for this attendance record.",
        )

    correction = AttendanceCorrection(
        record_id=req.record_id,
        student_id=student.id,
        requested_status=req.requested_status.upper(),
        previous_status=record.status,
        reason=req.reason.strip(),
        status="PENDING",
    )
    db.add(correction)
    await db.commit()
    await db.refresh(correction)

    return await get_correction_by_id(correction.id, db)


@router.get("", response_model=List[AttendanceCorrectionResponse])
async def list_corrections(
    status_filter: Optional[str] = Query(None, description="PENDING, APPROVED, REJECTED"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List corrections filtered by user role (Student sees their own; Teacher/Admin sees section/dept)."""
    stmt = (
        select(AttendanceCorrection)
        .options(
            selectinload(AttendanceCorrection.student).selectinload(Student.user),
            selectinload(AttendanceCorrection.record)
            .selectinload(AttendanceRecord.session)
            .selectinload(AttendanceSession.section)
            .selectinload(CourseSection.course),
            selectinload(AttendanceCorrection.reviewer),
        )
        .order_by(AttendanceCorrection.created_at.desc())
    )

    roles = current_user.roles_list
    if "STUDENT" in roles and "TEACHER" not in roles and "DEPT_ADMIN" not in roles and "SUPER_ADMIN" not in roles:
        if current_user.student_profile:
            stmt = stmt.where(AttendanceCorrection.student_id == current_user.student_profile.id)

    if status_filter:
        stmt = stmt.where(AttendanceCorrection.status == status_filter.upper())

    res = await db.execute(stmt)
    corrections = res.scalars().all()

    result = []
    for c in corrections:
        rec = c.record
        sess = rec.session if rec else None
        sec = sess.section if sess else None
        course = sec.course if sec else None

        result.append(
            AttendanceCorrectionResponse(
                id=c.id,
                record_id=c.record_id,
                student_id=c.student_id,
                student_name=c.student.user.full_name if c.student and c.student.user else "Unknown",
                course_code=course.code if course else "N/A",
                course_name=course.name if course else "N/A",
                session_title=sess.title if sess else "N/A",
                session_date=sess.session_date if sess else datetime.now().date(),
                requested_status=c.requested_status,
                previous_status=c.previous_status,
                reason=c.reason,
                status=c.status,
                reviewer_name=c.reviewer.full_name if c.reviewer else None,
                reviewed_at=c.reviewed_at,
                justification=c.justification,
                created_at=c.created_at,
            )
        )
    return result


@router.post("/{correction_id}/review", response_model=AttendanceCorrectionResponse)
async def review_correction(
    correction_id: uuid.UUID,
    req: AttendanceCorrectionReview,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """
    Teacher or Admin approves or rejects attendance correction request.
    Approved correction updates attendance record transactionally with full audit log and notification.
    """
    correction = await db.get(AttendanceCorrection, correction_id)
    if not correction:
        raise HTTPException(status_code=404, detail="Correction request not found.")

    if correction.status != "PENDING":
        raise HTTPException(status_code=400, detail="Correction request has already been reviewed.")

    decision = req.status.upper()
    if decision not in ("APPROVED", "REJECTED"):
        raise HTTPException(status_code=400, detail="Review status must be either APPROVED or REJECTED.")

    now = datetime.now(timezone.utc)
    correction.status = decision
    correction.reviewer_id = current_user.id
    correction.reviewer_role = "TEACHER" if "TEACHER" in current_user.roles_list else "DEPT_ADMIN"
    correction.reviewed_at = now
    correction.justification = req.justification

    # If APPROVED, transactionally update the actual attendance record
    if decision == "APPROVED":
        record = await db.get(AttendanceRecord, correction.record_id)
        if record:
            old_status = record.status
            record.status = correction.requested_status
            record.verification_method = "CORRECTION_OVERRIDE"
            record.verified_at = now
            record.metadata_info = {
                "corrected_by": str(current_user.id),
                "reason": correction.reason,
                "justification": req.justification,
            }

            audit = AuditLog(
                user_id=current_user.id,
                action="CORRECTION_APPROVED",
                entity_type="attendance_records",
                entity_id=str(record.id),
                diff={
                    "old_status": old_status,
                    "new_status": correction.requested_status,
                    "justification": req.justification,
                },
            )
            db.add(audit)

    # Notify student
    student = await db.get(Student, correction.student_id)
    if student:
        notif_msg = (
            f"Your attendance correction request for has been {decision}. "
            f"{'Justification: ' + req.justification if req.justification else ''}"
        )
        await NotificationService.create_notification(
            db=db,
            user_id=student.user_id,
            title=f"Attendance Correction {decision}",
            message=notif_msg,
            type="SUCCESS" if decision == "APPROVED" else "WARNING",
            link="/student/history",
        )

    await db.commit()
    return await get_correction_by_id(correction_id, db)


async def get_correction_by_id(correction_id: uuid.UUID, db: AsyncSession) -> AttendanceCorrectionResponse:
    stmt = (
        select(AttendanceCorrection)
        .options(
            selectinload(AttendanceCorrection.student).selectinload(Student.user),
            selectinload(AttendanceCorrection.record)
            .selectinload(AttendanceRecord.session)
            .selectinload(AttendanceSession.section)
            .selectinload(CourseSection.course),
            selectinload(AttendanceCorrection.reviewer),
        )
        .where(AttendanceCorrection.id == correction_id)
    )
    res = await db.execute(stmt)
    c = res.scalars().first()
    if not c:
        raise HTTPException(status_code=404, detail="Correction not found.")

    rec = c.record
    sess = rec.session if rec else None
    sec = sess.section if sess else None
    course = sec.course if sec else None

    return AttendanceCorrectionResponse(
        id=c.id,
        record_id=c.record_id,
        student_id=c.student_id,
        student_name=c.student.user.full_name if c.student and c.student.user else "Unknown",
        course_code=course.code if course else "N/A",
        course_name=course.name if course else "N/A",
        session_title=sess.title if sess else "N/A",
        session_date=sess.session_date if sess else datetime.now().date(),
        requested_status=c.requested_status,
        previous_status=c.previous_status,
        reason=c.reason,
        status=c.status,
        reviewer_name=c.reviewer.full_name if c.reviewer else None,
        reviewed_at=c.reviewed_at,
        justification=c.justification,
        created_at=c.created_at,
    )
