import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password
from app.api.v1.deps import get_current_user, require_dept_admin, require_super_admin
from app.models.user import User, Role, UserRole, Student, Teacher, AuditLog
from app.schemas.auth import UserProfileResponse

router = APIRouter()


@router.get("", response_model=List[UserProfileResponse])
async def list_users(
    role: Optional[str] = Query(None, description="Filter by role name"),
    department_id: Optional[uuid.UUID] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_dept_admin),
    db: AsyncSession = Depends(get_db),
):
    """List users scoped to university or department."""
    stmt = (
        select(User)
        .options(
            selectinload(User.user_roles).selectinload(UserRole.role),
            selectinload(User.student_profile),
            selectinload(User.teacher_profile),
        )
        .where(User.university_id == current_user.university_id)
    )

    # If DEPT_ADMIN (and not SUPER_ADMIN), restrict to their department
    if "SUPER_ADMIN" not in current_user.roles_list:
        stmt = stmt.where(User.department_id == current_user.department_id)
    elif department_id:
        stmt = stmt.where(User.department_id == department_id)

    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            or_(
                User.email.ilike(search_filter),
                User.full_name.ilike(search_filter),
            )
        )

    res = await db.execute(stmt)
    users = res.scalars().all()

    result = []
    for u in users:
        roles = u.roles_list
        if role and role not in roles:
            continue

        s_dict = {
            "id": str(u.student_profile.id),
            "student_id_number": u.student_profile.student_id_number,
            "department_id": str(u.student_profile.department_id),
            "batch_id": str(u.student_profile.batch_id),
        } if u.student_profile else None

        t_dict = {
            "id": str(u.teacher_profile.id),
            "employee_id_number": u.teacher_profile.employee_id_number,
            "designation": u.teacher_profile.designation,
            "department_id": str(u.teacher_profile.department_id),
        } if u.teacher_profile else None

        result.append(
            UserProfileResponse(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                phone=u.phone,
                avatar_url=u.avatar_url,
                university_id=u.university_id,
                department_id=u.department_id,
                roles=roles,
                is_active=u.is_active,
                is_suspended=u.is_suspended,
                student_profile=s_dict,
                teacher_profile=t_dict,
            )
        )

    return result


@router.put("/{user_id}/suspend")
async def toggle_suspend_user(
    user_id: uuid.UUID,
    suspend: bool = Query(...),
    current_user: User = Depends(require_dept_admin),
    db: AsyncSession = Depends(get_db),
):
    """Suspend or reactivate user account."""
    u = await db.get(User, user_id)
    if not u or u.university_id != current_user.university_id:
        raise HTTPException(status_code=404, detail="User not found.")

    if u.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot suspend your own account.")

    u.is_suspended = suspend
    audit = AuditLog(
        user_id=current_user.id,
        action="SUSPEND_USER" if suspend else "REACTIVATE_USER",
        entity_type="users",
        entity_id=str(user_id),
        diff={"is_suspended": suspend},
    )
    db.add(audit)
    await db.commit()
    return {"message": f"User account {'suspended' if suspend else 'reactivated'} successfully."}
