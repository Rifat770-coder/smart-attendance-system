import uuid
import io
import csv
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import get_current_user, require_dept_admin, require_teacher
from app.models.academic import (
    Department,
    AcademicYear,
    Semester,
    Batch,
    Course,
    CourseSection,
    TeacherAssignment,
    Enrollment,
    ClassSchedule,
)
from app.models.user import User, Student, Teacher
from app.schemas.academic import (
    DepartmentResponse,
    SemesterResponse,
    BatchResponse,
    CourseResponse,
    CourseCreate,
    CourseSectionResponse,
    CourseSectionCreate,
    ClassScheduleResponse,
)

router = APIRouter()


@router.get("/departments", response_model=List[DepartmentResponse])
async def list_departments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all departments in current user's university."""
    stmt = select(Department).where(Department.university_id == current_user.university_id)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/semesters", response_model=List[SemesterResponse])
async def list_semesters(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List semesters."""
    stmt = (
        select(Semester)
        .join(AcademicYear)
        .where(AcademicYear.university_id == current_user.university_id)
        .order_by(Semester.start_date.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/batches", response_model=List[BatchResponse])
async def list_batches(
    department_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List student batches."""
    stmt = (
        select(Batch)
        .join(Department)
        .where(Department.university_id == current_user.university_id)
    )
    if department_id:
        stmt = stmt.where(Batch.department_id == department_id)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/courses", response_model=List[CourseResponse])
async def list_courses(
    department_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List courses in department."""
    stmt = select(Course).join(Department).where(Department.university_id == current_user.university_id)
    if department_id:
        stmt = stmt.where(Course.department_id == department_id)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/courses", response_model=CourseResponse)
async def create_course(
    req: CourseCreate,
    current_user: User = Depends(require_dept_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new course."""
    course = Course(
        department_id=req.department_id,
        semester_id=req.semester_id,
        code=req.code.upper().strip(),
        name=req.name.strip(),
        credits=req.credits,
        description=req.description,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@router.get("/sections", response_model=List[CourseSectionResponse])
async def list_sections(
    course_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List course sections with enrolled student counts."""
    stmt = (
        select(CourseSection)
        .options(
            selectinload(CourseSection.course),
            selectinload(CourseSection.enrollments),
        )
        .join(Course)
        .join(Department)
        .where(Department.university_id == current_user.university_id)
    )
    if course_id:
        stmt = stmt.where(CourseSection.course_id == course_id)

    # If teacher role, only show sections assigned to this teacher (unless admin)
    user_roles = current_user.roles_list
    if "TEACHER" in user_roles and "DEPT_ADMIN" not in user_roles and "SUPER_ADMIN" not in user_roles:
        if current_user.teacher_profile:
            stmt = stmt.join(TeacherAssignment).where(TeacherAssignment.teacher_id == current_user.teacher_profile.id)

    res = await db.execute(stmt)
    sections = res.scalars().all()

    result = []
    for s in sections:
        result.append(
            CourseSectionResponse(
                id=s.id,
                course_id=s.course_id,
                semester_id=s.semester_id,
                section_name=s.section_name,
                capacity=s.capacity,
                course_code=s.course.code if s.course else None,
                course_name=s.course.name if s.course else None,
                enrolled_count=len(s.enrollments),
            )
        )
    return result


@router.post("/sections", response_model=CourseSectionResponse)
async def create_section(
    req: CourseSectionCreate,
    current_user: User = Depends(require_dept_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new section for a course."""
    section = CourseSection(
        course_id=req.course_id,
        semester_id=req.semester_id,
        section_name=req.section_name.strip(),
        capacity=req.capacity,
    )
    db.add(section)
    await db.commit()
    await db.refresh(section)
    return section


@router.get("/sections/{section_id}/students")
async def list_section_students(
    section_id: uuid.UUID,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """Get list of students enrolled in a section."""
    stmt = (
        select(Student)
        .options(
            selectinload(Student.user),
            selectinload(Student.batch),
        )
        .join(Enrollment, Enrollment.student_id == Student.id)
        .where(
            Enrollment.section_id == section_id,
            Enrollment.status == "ACTIVE",
        )
    )
    res = await db.execute(stmt)
    students = res.scalars().all()

    return [
        {
            "student_id": str(s.id),
            "student_id_number": s.student_id_number,
            "full_name": s.user.full_name,
            "email": s.user.email,
            "batch_name": s.batch.name if s.batch else None,
        }
        for s in students
    ]


@router.post("/sections/{section_id}/bulk-enroll-csv")
async def bulk_enroll_csv(
    section_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(require_dept_admin),
    db: AsyncSession = Depends(get_db),
):
    """Bulk enroll students into a section from uploaded CSV."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8")))

    enrolled = 0
    errors = []

    for idx, row in enumerate(reader, 1):
        email_or_id = row.get("email") or row.get("student_id")
        if not email_or_id:
            errors.append(f"Row {idx}: Missing email or student_id")
            continue

        # Look up student
        stmt = (
            select(Student)
            .join(User)
            .where(
                or_(
                    User.email == email_or_id.strip().lower(),
                    Student.student_id_number == email_or_id.strip(),
                )
            )
        )
        student = (await db.execute(stmt)).scalars().first()
        if not student:
            errors.append(f"Row {idx}: Student '{email_or_id}' not found")
            continue

        # Check existing enrollment
        existing_stmt = select(Enrollment).where(
            Enrollment.student_id == student.id,
            Enrollment.section_id == section_id,
        )
        if (await db.execute(existing_stmt)).scalars().first():
            continue

        enr = Enrollment(student_id=student.id, section_id=section_id, status="ACTIVE")
        db.add(enr)
        enrolled += 1

    await db.commit()
    return {
        "message": f"Successfully enrolled {enrolled} students.",
        "enrolled_count": enrolled,
        "errors": errors,
    }


@router.get("/schedules", response_model=List[ClassScheduleResponse])
async def list_schedules(
    section_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List class routines/schedules."""
    stmt = select(ClassSchedule)
    if section_id:
        stmt = stmt.where(ClassSchedule.section_id == section_id)
    res = await db.execute(stmt)
    return res.scalars().all()
