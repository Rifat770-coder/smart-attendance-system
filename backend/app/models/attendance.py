import uuid
import datetime as dt
from typing import List, Optional
from sqlalchemy import (
    String,
    Text,
    Float,
    Integer,
    Date,
    Time,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin, utc_now


class AttendancePolicy(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "attendance_policies"

    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    minimum_percentage: Mapped[float] = mapped_column(Float, default=75.0, nullable=False)
    late_weight: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    allowed_late_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    grace_period_seconds: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    department: Mapped["Department"] = relationship("Department", back_populates="attendance_policies")


class AttendanceSession(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "attendance_sessions"

    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teachers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    session_date: Mapped[dt.date] = mapped_column("date", Date, default=dt.date.today, nullable=False, index=True)
    start_time: Mapped[dt.time] = mapped_column(Time, nullable=False)
    end_time: Mapped[dt.time] = mapped_column(Time, nullable=False)
    
    # State Machine: SCHEDULED -> ACTIVE <-> PAUSED -> COMPLETED / CANCELLED
    state: Mapped[str] = mapped_column(String(50), default="SCHEDULED", nullable=False, index=True)
    rotation_interval_seconds: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    started_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    section: Mapped["CourseSection"] = relationship("CourseSection", back_populates="attendance_sessions")
    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="sessions")
    records: Mapped[List["AttendanceRecord"]] = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")


class AttendanceRecord(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "attendance_records"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attendance_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Status: PRESENT, LATE, ABSENT, EXCUSED
    status: Mapped[str] = mapped_column(String(50), default="PRESENT", nullable=False, index=True)
    # Verification method: DYNAMIC_QR, MANUAL
    verification_method: Mapped[str] = mapped_column(String(50), default="DYNAMIC_QR", nullable=False)
    verified_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    metadata_info: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_session_student_attendance"),
        Index("ix_attendance_student_session", "student_id", "session_id"),
    )

    session: Mapped["AttendanceSession"] = relationship("AttendanceSession", back_populates="records")
    student: Mapped["Student"] = relationship("Student", back_populates="attendance_records")
    corrections: Mapped[List["AttendanceCorrection"]] = relationship("AttendanceCorrection", back_populates="record", cascade="all, delete-orphan")


class AttendanceCorrection(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "attendance_corrections"

    record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attendance_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requested_status: Mapped[str] = mapped_column(String(50), nullable=False)
    previous_status: Mapped[str] = mapped_column(String(50), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    
    reviewer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewer_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False, index=True)
    reviewed_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    justification: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    record: Mapped["AttendanceRecord"] = relationship("AttendanceRecord", back_populates="corrections")
    student: Mapped["Student"] = relationship("Student", back_populates="corrections")
    reviewer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reviewer_id])


class LeaveRequest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "leave_requests"

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
    start_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False)
    approved_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    student: Mapped["Student"] = relationship("Student", back_populates="leave_requests")
    section: Mapped["CourseSection"] = relationship("CourseSection")
    approver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by_id])
