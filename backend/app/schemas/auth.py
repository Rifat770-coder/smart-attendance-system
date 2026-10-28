import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class RoleResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    permissions: dict = {}

    class Config:
        from_attributes = True


class UserProfileResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    university_id: uuid.UUID
    department_id: Optional[uuid.UUID] = None
    roles: List[str]
    is_active: bool
    is_suspended: bool
    student_profile: Optional[dict] = None
    teacher_profile: Optional[dict] = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    message: str = "Login successful"
    user: UserProfileResponse
    csrf_token: str


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8, max_length=128)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class SessionInfo(BaseModel):
    id: uuid.UUID
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True
