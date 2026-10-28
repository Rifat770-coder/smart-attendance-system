from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    UserProfileResponse,
    PasswordChangeRequest,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user with Argon2id and set HttpOnly server-side session cookie."""
    ip_addr = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    user, raw_token, csrf_token = await AuthService.authenticate_user(
        db=db,
        email=req.email,
        password=req.password,
        ip_address=ip_addr,
        user_agent=user_agent,
    )

    # Set secure HttpOnly cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=raw_token,
        max_age=settings.SESSION_MAX_AGE_SECONDS,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
    )

    # Build response profile
    student_dict = None
    if user.student_profile:
        student_dict = {
            "id": str(user.student_profile.id),
            "student_id_number": user.student_profile.student_id_number,
            "department_id": str(user.student_profile.department_id),
            "batch_id": str(user.student_profile.batch_id),
        }

    teacher_dict = None
    if user.teacher_profile:
        teacher_dict = {
            "id": str(user.teacher_profile.id),
            "employee_id_number": user.teacher_profile.employee_id_number,
            "designation": user.teacher_profile.designation,
            "department_id": str(user.teacher_profile.department_id),
        }

    user_profile = UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        avatar_url=user.avatar_url,
        university_id=user.university_id,
        department_id=user.department_id,
        roles=user.roles_list,
        is_active=user.is_active,
        is_suspended=user.is_suspended,
        student_profile=student_dict,
        teacher_profile=teacher_dict,
    )

    return LoginResponse(
        message="Login successful",
        user=user_profile,
        csrf_token=csrf_token,
    )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Revoke current auth session and clear cookie."""
    raw_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if raw_token:
        await AuthService.logout_session(db, raw_token)

    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        domain=settings.COOKIE_DOMAIN,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
    )
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Get the authenticated user's profile and roles."""
    student_dict = None
    if current_user.student_profile:
        student_dict = {
            "id": str(current_user.student_profile.id),
            "student_id_number": current_user.student_profile.student_id_number,
            "department_id": str(current_user.student_profile.department_id),
            "batch_id": str(current_user.student_profile.batch_id),
        }

    teacher_dict = None
    if current_user.teacher_profile:
        teacher_dict = {
            "id": str(current_user.teacher_profile.id),
            "employee_id_number": current_user.teacher_profile.employee_id_number,
            "designation": current_user.teacher_profile.designation,
            "department_id": str(current_user.teacher_profile.department_id),
        }

    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        phone=current_user.phone,
        avatar_url=current_user.avatar_url,
        university_id=current_user.university_id,
        department_id=current_user.department_id,
        roles=current_user.roles_list,
        is_active=current_user.is_active,
        is_suspended=current_user.is_suspended,
        student_profile=student_dict,
        teacher_profile=teacher_dict,
    )


@router.post("/change-password")
async def change_password(
    req: PasswordChangeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change current user's password."""
    ip_addr = request.client.host if request.client else "unknown"
    await AuthService.change_password(
        db=db,
        user=current_user,
        old_password=req.old_password,
        new_password=req.new_password,
        ip_address=ip_addr,
    )
    return {"message": "Password changed successfully"}
