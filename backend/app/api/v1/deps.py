import uuid
from datetime import datetime, timezone
from typing import List, Optional, Callable
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.core.config import settings
from app.core.database import get_db
from app.core.redis import get_redis_client
from app.core.security import hash_session_token
from app.models.user import User, AuthSession, UserRole, Role, Student, Teacher


async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Extract session token from cookie or Authorization header and load user."""
    raw_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not raw_token:
        # Fallback to Authorization: Bearer <token>
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            raw_token = auth_header[7:].strip()

    if not raw_token:
        return None

    token_hash = hash_session_token(raw_token)
    now = datetime.now(timezone.utc)

    # Query active auth session with user and roles
    stmt = (
        select(AuthSession)
        .options(
            selectinload(AuthSession.user)
            .selectinload(User.user_roles)
            .selectinload(UserRole.role),
            selectinload(AuthSession.user).selectinload(User.student_profile),
            selectinload(AuthSession.user).selectinload(User.teacher_profile),
        )
        .where(
            AuthSession.session_token_hash == token_hash,
            AuthSession.expires_at > now,
            AuthSession.revoked_at.is_(None),
        )
    )
    result = await db.execute(stmt)
    auth_session = result.scalars().first()

    if not auth_session or not auth_session.user:
        return None

    user = auth_session.user
    if not user.is_active or user.is_suspended:
        return None

    return user


async def get_current_user(
    user: Optional[User] = Depends(get_current_user_optional),
) -> User:
    """Enforce authentication requirement."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Session is invalid or expired.",
            headers={"WWW-Authenticate": "Cookie"},
        )
    return user


def require_role(allowed_roles: List[str]) -> Callable:
    """Dependency factory checking user roles."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_roles = [ur.role.name for ur in current_user.user_roles if ur.role]
        # Super admin always has access
        if "SUPER_ADMIN" in user_roles:
            return current_user
        
        has_role = any(r in allowed_roles for r in user_roles)
        if not has_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker


# Role shortcut dependencies
require_super_admin = require_role(["SUPER_ADMIN"])
require_dept_admin = require_role(["DEPT_ADMIN", "SUPER_ADMIN"])
require_teacher = require_role(["TEACHER", "DEPT_ADMIN", "SUPER_ADMIN"])
require_student = require_role(["STUDENT"])


async def get_redis():
    """Yield async Redis client with automatic connection lifecycle."""
    client = aioredis.from_url(settings.REDIS_URL, decode_responses=True, encoding="utf-8")
    try:
        yield client
    finally:
        await client.aclose()
