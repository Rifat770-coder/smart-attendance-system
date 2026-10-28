import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String,
    Text,
    Boolean,
    Float,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin, utc_now


class Notification(Base, UUIDMixin):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    # Type: WARNING, INFO, SUCCESS, CORRECTION, SECURITY
    type: Mapped[str] = mapped_column(String(50), default="INFO", nullable=False)
    link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    user: Mapped["User"] = relationship("User", back_populates="notifications")


class NotificationPreference(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "notification_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    in_app_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    min_threshold_alert: Mapped[float] = mapped_column(Float, default=75.0, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="notification_preference")


class ReportJob(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "report_jobs"

    requested_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    report_type: Mapped[str] = mapped_column(String(50), nullable=False)  # STUDENT_REPORT, SECTION_REPORT, DEPT_REPORT
    file_format: Mapped[str] = mapped_column(String(20), default="CSV", nullable=False)  # CSV, XLSX, PDF
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False)   # PENDING, PROCESSING, COMPLETED, FAILED
    filters: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    requested_by: Mapped["User"] = relationship("User")
