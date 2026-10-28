import uuid
import datetime as dt
from typing import List, Optional
from pydantic import BaseModel, Field


class AttendanceSessionCreate(BaseModel):
    section_id: uuid.UUID
    title: str = Field(min_length=3, max_length=255)
    session_date: Optional[dt.date] = None
    start_time: Optional[dt.time] = None
    end_time: Optional[dt.time] = None
    rotation_interval_seconds: int = Field(default=10, ge=5, le=60)
    notes: Optional[str] = None


class AttendanceSessionStateUpdate(BaseModel):
    state: str = Field(..., description="ACTIVE, PAUSED, COMPLETED, CANCELLED")


class AttendanceSessionResponse(BaseModel):
    id: uuid.UUID
    section_id: uuid.UUID
    teacher_id: uuid.UUID
    title: str
    session_date: dt.date
    start_time: dt.time
    end_time: dt.time
    state: str
    rotation_interval_seconds: int
    started_at: Optional[dt.datetime] = None
    ended_at: Optional[dt.datetime] = None
    course_name: Optional[str] = None
    course_code: Optional[str] = None
    section_name: Optional[str] = None
    teacher_name: Optional[str] = None
    enrolled_count: int = 0
    present_count: int = 0
    late_count: int = 0
    absent_count: int = 0
    excused_count: int = 0

    class Config:
        from_attributes = True


class DynamicQRChallengeResponse(BaseModel):
    session_id: uuid.UUID
    challenge_token: str
    sequence: int
    expires_in_seconds: int
    qr_payload: str
    is_active: bool


class ScanAttendanceRequest(BaseModel):
    session_id: uuid.UUID
    challenge_token: str
    client_timestamp: Optional[dt.datetime] = None


class AttendanceRecordResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    student_id: uuid.UUID
    student_name: str
    student_id_number: str
    status: str
    verification_method: str
    verified_at: dt.datetime

    class Config:
        from_attributes = True


class ManualAttendanceRecordCreate(BaseModel):
    session_id: uuid.UUID
    student_id: uuid.UUID
    status: str = Field(..., description="PRESENT, LATE, ABSENT, EXCUSED")
    justification: str = Field(min_length=3)


class AttendanceCorrectionCreate(BaseModel):
    record_id: uuid.UUID
    requested_status: str = Field(..., description="PRESENT or EXCUSED")
    reason: str = Field(min_length=5, max_length=500)


class AttendanceCorrectionReview(BaseModel):
    status: str = Field(..., description="APPROVED or REJECTED")
    justification: Optional[str] = None


class AttendanceCorrectionResponse(BaseModel):
    id: uuid.UUID
    record_id: uuid.UUID
    student_id: uuid.UUID
    student_name: str
    course_code: str
    course_name: str
    session_title: str
    session_date: dt.date
    requested_status: str
    previous_status: str
    reason: str
    status: str
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[dt.datetime] = None
    justification: Optional[str] = None
    created_at: dt.datetime

    class Config:
        from_attributes = True


class CourseAttendanceStats(BaseModel):
    course_id: uuid.UUID
    course_code: str
    course_name: str
    section_id: uuid.UUID
    section_name: str
    eligible_sessions: int
    present_sessions: int
    late_sessions: int
    absent_sessions: int
    excused_sessions: int
    attendance_percentage: float
    is_low_attendance: bool
    policy_minimum: float


class StudentAttendanceSummary(BaseModel):
    student_id: uuid.UUID
    student_name: str
    student_id_number: str
    overall_percentage: float
    total_eligible_sessions: int
    total_present: int
    total_late: int
    total_absent: int
    total_excused: int
    course_stats: List[CourseAttendanceStats]


class AttendancePolicyUpdate(BaseModel):
    minimum_percentage: float = Field(ge=0.0, le=100.0)
    late_weight: float = Field(ge=0.0, le=1.0)
    allowed_late_minutes: int = Field(ge=0, le=120)
    grace_period_seconds: int = Field(ge=0, le=60)

