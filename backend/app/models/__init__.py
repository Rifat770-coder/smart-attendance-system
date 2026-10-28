from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin
from app.models.academic import (
    University,
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
from app.models.user import (
    Role,
    User,
    UserRole,
    Student,
    Teacher,
    AuthSession,
    SecurityEvent,
    AuditLog,
)
from app.models.attendance import (
    AttendancePolicy,
    AttendanceSession,
    AttendanceRecord,
    AttendanceCorrection,
    LeaveRequest,
)
from app.models.notification import (
    Notification,
    NotificationPreference,
    ReportJob,
)

__all__ = [
    "Base",
    "UUIDMixin",
    "TimestampMixin",
    "University",
    "Department",
    "AcademicYear",
    "Semester",
    "Batch",
    "Course",
    "CourseSection",
    "TeacherAssignment",
    "Enrollment",
    "ClassSchedule",
    "Role",
    "User",
    "UserRole",
    "Student",
    "Teacher",
    "AuthSession",
    "SecurityEvent",
    "AuditLog",
    "AttendancePolicy",
    "AttendanceSession",
    "AttendanceRecord",
    "AttendanceCorrection",
    "LeaveRequest",
    "Notification",
    "NotificationPreference",
    "ReportJob",
]
