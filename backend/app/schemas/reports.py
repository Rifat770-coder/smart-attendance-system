import uuid
import datetime as dt
from typing import List, Optional
from pydantic import BaseModel


class ReportFilterParams(BaseModel):
    department_id: Optional[uuid.UUID] = None
    semester_id: Optional[uuid.UUID] = None
    course_id: Optional[uuid.UUID] = None
    section_id: Optional[uuid.UUID] = None
    start_date: Optional[dt.date] = None
    end_date: Optional[dt.date] = None
    student_id: Optional[uuid.UUID] = None


class SectionAttendanceReport(BaseModel):
    section_id: uuid.UUID
    course_code: str
    course_name: str
    section_name: str
    total_sessions: int
    enrolled_students: int
    average_attendance_percentage: float
    students: List[dict]


class DepartmentAttendanceReport(BaseModel):
    department_id: uuid.UUID
    department_name: str
    total_courses: int
    total_students: int
    total_sessions_held: int
    average_attendance_percentage: float
    sections: List[SectionAttendanceReport]
