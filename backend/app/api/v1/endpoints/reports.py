import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import get_current_user, require_teacher, require_dept_admin
from app.models.user import User
from app.schemas.attendance import StudentAttendanceSummary
from app.services.attendance_service import AttendanceService
from app.services.report_service import ReportService

router = APIRouter()


@router.get("/student/summary", response_model=StudentAttendanceSummary)
async def get_student_attendance_summary(
    student_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get mathematically correct student attendance summary.
    Students see only their own records; Teachers/Admins can pass student_id.
    """
    target_student_id = student_id
    if "STUDENT" in current_user.roles_list and "TEACHER" not in current_user.roles_list and "DEPT_ADMIN" not in current_user.roles_list and "SUPER_ADMIN" not in current_user.roles_list:
        if not current_user.student_profile:
            raise HTTPException(status_code=403, detail="Student profile not found.")
        target_student_id = current_user.student_profile.id
    elif not target_student_id:
        if current_user.student_profile:
            target_student_id = current_user.student_profile.id
        else:
            raise HTTPException(status_code=400, detail="student_id query parameter is required.")

    return await AttendanceService.calculate_student_attendance(db, target_student_id)


@router.get("/section/{section_id}")
async def get_section_report(
    section_id: uuid.UUID,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """Get complete session-by-student attendance matrix for a section."""
    matrix = await ReportService.get_section_attendance_matrix(db, section_id)
    if not matrix:
        raise HTTPException(status_code=404, detail="Course section not found.")
    return matrix


@router.get("/section/{section_id}/export")
async def export_section_report(
    section_id: uuid.UUID,
    format: str = Query("csv", description="csv, xlsx, or pdf"),
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """Export attendance report as CSV, XLSX, or PDF."""
    matrix = await ReportService.get_section_attendance_matrix(db, section_id)
    if not matrix:
        raise HTTPException(status_code=404, detail="Course section not found.")

    fmt = format.lower().strip()
    course_code = matrix.get("course_code", "course")
    sec_name = matrix.get("section_name", "section").replace(" ", "_")

    if fmt == "csv":
        csv_data = ReportService.generate_csv(matrix)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="attendance_{course_code}_{sec_name}.csv"'},
        )
    elif fmt == "xlsx":
        xlsx_data = ReportService.generate_excel(matrix)
        return Response(
            content=xlsx_data,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="attendance_{course_code}_{sec_name}.xlsx"'},
        )
    elif fmt == "pdf":
        pdf_data = ReportService.generate_pdf(matrix)
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="attendance_{course_code}_{sec_name}.pdf"'},
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format '{format}'. Supported: csv, xlsx, pdf")
