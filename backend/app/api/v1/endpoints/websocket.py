import uuid
import json
import asyncio
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import async_session_factory
from app.core.redis import get_redis_client
from app.core.security import hash_session_token
from app.models.user import User, AuthSession, UserRole, Role
from app.models.attendance import AttendanceSession

router = APIRouter()


async def get_ws_user(raw_token: Optional[str]) -> Optional[User]:
    """Authenticate WebSocket connection using session token."""
    if not raw_token:
        return None

    token_hash = hash_session_token(raw_token)
    now = datetime.now(timezone.utc)

    async with async_session_factory() as db:
        stmt = (
            select(AuthSession)
            .options(
                selectinload(AuthSession.user)
                .selectinload(User.user_roles)
                .selectinload(UserRole.role),
                # teacher_profile is read after this session closes, so it must
                # be eagerly loaded — a lazy load on a detached instance raises
                # DetachedInstanceError.
                selectinload(AuthSession.user).selectinload(User.teacher_profile),
            )
            .where(
                AuthSession.session_token_hash == token_hash,
                AuthSession.expires_at > now,
                AuthSession.revoked_at.is_(None),
            )
        )
        res = await db.execute(stmt)
        auth_session = res.scalars().first()
        if (
            not auth_session
            or not auth_session.user
            or not auth_session.user.is_active
            or auth_session.user.is_suspended
        ):
            return None
        return auth_session.user


@router.websocket("/sessions/{session_id}")
async def attendance_live_feed(
    websocket: WebSocket,
    session_id: uuid.UUID,
    token: Optional[str] = Query(None),
):
    """
    Authenticated real-time WebSocket connection for teachers and admins to observe live attendance.
    Listens on Redis Pub/Sub backplane `ws:session:{session_id}:events` and broadcasts events to clients.
    """
    # 1. Check token in query param or cookie
    raw_token = token or websocket.cookies.get(settings.SESSION_COOKIE_NAME)
    user = await get_ws_user(raw_token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Check authorization to view this session
    async with async_session_factory() as db:
        session_stmt = select(AttendanceSession).where(AttendanceSession.id == session_id)
        att_session = (await db.execute(session_stmt)).scalars().first()
        if not att_session:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        roles = user.roles_list
        if "SUPER_ADMIN" not in roles and "DEPT_ADMIN" not in roles:
            # Must be the session's assigned teacher
            if not user.teacher_profile or att_session.teacher_id != user.teacher_profile.id:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

    await websocket.accept()

    # 3. Subscribe to Redis channel
    redis = await get_redis_client()
    pubsub = redis.pubsub()
    channel_name = f"ws:session:{session_id}:events"
    await pubsub.subscribe(channel_name)

    # Send initial connection acknowledgment
    await websocket.send_text(
        json.dumps({
            "event": "CONNECTED",
            "session_id": str(session_id),
            "state": att_session.state,
            "connected_at": datetime.now(timezone.utc).isoformat(),
        })
    )

    async def redis_listener():
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = message["data"]
                    await websocket.send_text(data)
        except (asyncio.CancelledError, Exception):
            pass

    listener_task = asyncio.create_task(redis_listener())

    try:
        # Keep connection alive & handle incoming pings
        while True:
            client_msg = await websocket.receive_text()
            if client_msg == "ping":
                await websocket.send_text(json.dumps({"event": "PONG"}))
    except WebSocketDisconnect:
        pass
    finally:
        listener_task.cancel()
        await pubsub.unsubscribe(channel_name)
        await pubsub.close()
