import uuid
import datetime as dt
from typing import List, Optional
from sqlalchemy import (
    String,
    Text,
    Boolean,
    Integer,
    Date,
    Time,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class University(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "universities"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    departments: Mapped[List["Department"]] = relationship("Department", back_populates="university", cascade="all, delete-orphan")
    users: Mapped[List["User"]] = relationship("User", back_populates="university")
    academic_years: Mapped[List["AcademicYear"]] = relationship("AcademicYear", back_populates="university", cascade="all, delete-orphan")


class Department(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "departments"

    university_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("universities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    head_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", name="fk_departments_head_user_id", use_alter=True, ondelete="SET NULL"),
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint("university_id", "code", name="uq_department_university_code"),
    )

    university: Mapped["University"] = relationship("University", back_populates="departments")
    users: Mapped[List["User"]] = relationship("User", foreign_keys="User.department_id", back_populates="department")
    batches: Mapped[List["Batch"]] = relationship("Batch", back_populates="department", cascade="all, delete-orphan")
    courses: Mapped[List["Course"]] = relationship("Course", back_populates="department", cascade="all, delete-orphan")
    students: Mapped[List["Student"]] = relationship("Student", back_populates="department")
    teachers: Mapped[List["Teacher"]] = relationship("Teacher", back_populates="department")
    attendance_policies: Mapped[List["AttendancePolicy"]] = relationship("AttendancePolicy", back_populates="department", cascade="all, delete-orphan")


class AcademicYear(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "academic_years"

    university_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("universities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    year_name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("university_id", "year_name", name="uq_academic_year_university_name"),
    )

    university: Mapped["University"] = relationship("University", back_populates="academic_years")
    semesters: Mapped[List["Semester"]] = relationship("Semester", back_populates="academic_year", cascade="all, delete-orphan")


class Semester(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "semesters"

    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("academic_years.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    start_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("academic_year_id", "code", name="uq_semester_academic_year_code"),
    )

    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear", back_populates="semesters")
    courses: Mapped[List["Course"]] = relationship("Course", back_populates="semester")
    sections: Mapped[List["CourseSection"]] = relationship("CourseSection", back_populates="semester")


class Batch(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "batches"

    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_year: Mapped[int] = mapped_column(Integer, nullable=False)
    end_year: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("department_id", "name", name="uq_batch_department_name"),
    )

    department: Mapped["Department"] = relationship("Department", back_populates="batches")
    students: Mapped[List["Student"]] = relationship("Student", back_populates="batch")


class Course(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "courses"

    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    semester_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("semesters.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    credits: Mapped[float] = mapped_column(nullable=False, default=3.0)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("department_id", "code", name="uq_course_dept_code"),
    )

    department: Mapped["Department"] = relationship("Department", back_populates="courses")
    semester: Mapped[Optional["Semester"]] = relationship("Semester", back_populates="courses")
    sections: Mapped[List["CourseSection"]] = relationship("CourseSection", back_populates="course", cascade="all, delete-orphan")


class CourseSection(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "course_sections"

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    semester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("semesters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section_name: Mapped[str] = mapped_column(String(50), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=60, nullable=False)

    __table_args__ = (
        UniqueConstraint("course_id", "semester_id", "section_name", name="uq_section_course_semester_name"),
    )

    course: Mapped["Course"] = relationship("Course", back_populates="sections")
    semester: Mapped["Semester"] = relationship("Semester", back_populates="sections")
    teacher_assignments: Mapped[List["TeacherAssignment"]] = relationship("TeacherAssignment", back_populates="section", cascade="all, delete-orphan")
    enrollments: Mapped[List["Enrollment"]] = relationship("Enrollment", back_populates="section", cascade="all, delete-orphan")
    class_schedules: Mapped[List["ClassSchedule"]] = relationship("ClassSchedule", back_populates="section", cascade="all, delete-orphan")
    attendance_sessions: Mapped[List["AttendanceSession"]] = relationship("AttendanceSession", back_populates="section", cascade="all, delete-orphan")


class TeacherAssignment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "teacher_assignments"

    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teachers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("teacher_id", "section_id", name="uq_teacher_assignment"),
    )

    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="assignments")
    section: Mapped["CourseSection"] = relationship("CourseSection", back_populates="teacher_assignments")


class Enrollment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "enrollments"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)
    enrolled_at: Mapped[dt.date] = mapped_column(Date, default=dt.date.today, nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "section_id", name="uq_student_section_enrollment"),
    )

    student: Mapped["Student"] = relationship("Student", back_populates="enrollments")
    section: Mapped["CourseSection"] = relationship("CourseSection", back_populates="enrollments")


class ClassSchedule(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "class_schedules"

    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    day_of_week: Mapped[str] = mapped_column(String(20), nullable=False)
    start_time: Mapped[dt.time] = mapped_column(Time, nullable=False)
    end_time: Mapped[dt.time] = mapped_column(Time, nullable=False)
    room_number: Mapped[str] = mapped_column(String(50), nullable=False)

    section: Mapped["CourseSection"] = relationship("CourseSection", back_populates="class_schedules")
