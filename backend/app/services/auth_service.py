import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import (
    verify_password,
    hash_password,
    generate_session_token,
    hash_session_token,
    generate_csrf_token,
)
from app.models.user import User, AuthSession, SecurityEvent, UserRole, Student, Teacher


class AuthService:
    @staticmethod
    async def authenticate_user(
        db: AsyncSession,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[User, str, str]:
        """
        Authenticate user credentials, record security event, and create auth session.
        Returns: (user, raw_session_token, csrf_token)
        """
        email = email.lower().strip()
        stmt = (
            select(User)
            .options(
                selectinload(User.user_roles).selectinload(UserRole.role),
                selectinload(User.student_profile),
                selectinload(User.teacher_profile),
            )
            .where(User.email == email)
        )
        res = await db.execute(stmt)
        user = res.scalars().first()

        now = datetime.now(timezone.utc)

        if not user or not verify_password(password, user.password_hash):
            # Log failed security event
            sec_event = SecurityEvent(
                user_id=user.id if user else None,
                event_type="LOGIN_FAILED",
                ip_address=ip_address,
                details={"email": email, "reason": "Invalid credentials", "user_agent": user_agent},
            )
            db.add(sec_event)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not user.is_active or user.is_suspended:
            sec_event = SecurityEvent(
                user_id=user.id,
                event_type="LOGIN_BLOCKED",
                ip_address=ip_address,
                details={"reason": "Account suspended or deactivated"},
            )
            db.add(sec_event)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is suspended or deactivated. Please contact your administrator.",
            )

        # Update last login
        user.last_login_at = now

        # Create session token and db hash
        raw_token, token_hash = generate_session_token()
        expires_at = now + timedelta(seconds=settings.SESSION_MAX_AGE_SECONDS)

        auth_session = AuthSession(
            session_token_hash=token_hash,
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at,
        )
        db.add(auth_session)

        # Log successful login
        sec_event = SecurityEvent(
            user_id=user.id,
            event_type="LOGIN_SUCCESS",
            ip_address=ip_address,
            details={"user_agent": user_agent},
        )
        db.add(sec_event)

        await db.commit()

        csrf_token = generate_csrf_token(raw_token)
        return user, raw_token, csrf_token

    @staticmethod
    async def logout_session(db: AsyncSession, raw_token: str) -> None:
        """Revoke current auth session."""
        token_hash = hash_session_token(raw_token)
        now = datetime.now(timezone.utc)
        stmt = (
            update(AuthSession)
            .where(AuthSession.session_token_hash == token_hash)
            .values(revoked_at=now)
        )
        await db.execute(stmt)
        await db.commit()

    @staticmethod
    async def change_password(
        db: AsyncSession,
        user: User,
        old_password: str,
        new_password: str,
        ip_address: Optional[str] = None,
    ) -> None:
        """Verify old password and set new password."""
        if not verify_password(old_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password does not match.",
            )

        user.password_hash = hash_password(new_password)
        sec_event = SecurityEvent(
            user_id=user.id,
            event_type="PASSWORD_CHANGED",
            ip_address=ip_address,
            details={},
        )
        db.add(sec_event)
        await db.commit()
