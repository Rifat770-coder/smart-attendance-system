import uuid
import datetime as dt
from typing import List, Optional
from pydantic import BaseModel, Field


class DepartmentBase(BaseModel):
    name: str
    code: str
    head_user_id: Optional[uuid.UUID] = None


class DepartmentCreate(DepartmentBase):
    university_id: uuid.UUID


class DepartmentResponse(DepartmentBase):
    id: uuid.UUID
    university_id: uuid.UUID
    created_at: dt.datetime

    class Config:
        from_attributes = True


class BatchBase(BaseModel):
    name: str
    start_year: int
    end_year: int


class BatchCreate(BatchBase):
    department_id: uuid.UUID


class BatchResponse(BatchBase):
    id: uuid.UUID
    department_id: uuid.UUID

    class Config:
        from_attributes = True


class SemesterBase(BaseModel):
    name: str
    code: str
    start_date: dt.date
    end_date: dt.date
    is_active: bool = False


class SemesterCreate(SemesterBase):
    academic_year_id: uuid.UUID


class SemesterResponse(SemesterBase):
    id: uuid.UUID
    academic_year_id: uuid.UUID

    class Config:
        from_attributes = True


class CourseBase(BaseModel):
    code: str
    name: str
    credits: float = 3.0
    description: Optional[str] = None


class CourseCreate(CourseBase):
    department_id: uuid.UUID
    semester_id: Optional[uuid.UUID] = None


class CourseResponse(CourseBase):
    id: uuid.UUID
    department_id: uuid.UUID
    semester_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True


class CourseSectionBase(BaseModel):
    section_name: str
    capacity: int = 60


class CourseSectionCreate(CourseSectionBase):
    course_id: uuid.UUID
    semester_id: uuid.UUID


class CourseSectionResponse(CourseSectionBase):
    id: uuid.UUID
    course_id: uuid.UUID
    semester_id: uuid.UUID
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    enrolled_count: Optional[int] = 0

    class Config:
        from_attributes = True


class ClassScheduleBase(BaseModel):
    day_of_week: str
    start_time: dt.time
    end_time: dt.time
    room_number: str


class ClassScheduleCreate(ClassScheduleBase):
    section_id: uuid.UUID


class ClassScheduleResponse(ClassScheduleBase):
    id: uuid.UUID
    section_id: uuid.UUID

    class Config:
        from_attributes = True


class EnrollmentCreate(BaseModel):
    student_id: uuid.UUID
    section_id: uuid.UUID


class BulkEnrollmentRequest(BaseModel):
    section_id: uuid.UUID
    student_ids: List[uuid.UUID]
