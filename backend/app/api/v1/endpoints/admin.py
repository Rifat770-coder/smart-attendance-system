import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, text
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.core.database import get_db
from app.api.v1.deps import require_super_admin, require_dept_admin, get_redis
from app.models.user import User, AuditLog, SecurityEvent
from app.models.academic import Department
from app.models.attendance import AttendancePolicy, AttendanceSession
from app.schemas.attendance import AttendancePolicyUpdate

router = APIRouter()


@router.get("/health")
async def system_health(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """System health check endpoint for monitoring, Docker, and Super Admin dashboard."""
    # Check DB
    db_start = time.time()
    await db.execute(text("SELECT 1"))
    db_latency_ms = round((time.time() - db_start) * 1000, 2)

    # Check Redis
    redis_start = time.time()
    await redis.ping()
    redis_latency_ms = round((time.time() - redis_start) * 1000, 2)

    # Summary counts
    users_cnt = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active_sessions_cnt = (
        await db.execute(
            select(func.count(AttendanceSession.id)).where(AttendanceSession.state == "ACTIVE")
        )
    ).scalar() or 0

    return {
        "status": "healthy",
        "database": {"status": "connected", "latency_ms": db_latency_ms},
        "redis": {"status": "connected", "latency_ms": redis_latency_ms},
        "metrics": {
            "total_users": users_cnt,
            "active_attendance_sessions": active_sessions_cnt,
        },
    }


@router.get("/audit-logs")
async def list_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_dept_admin),
    db: AsyncSession = Depends(get_db),
):
    """List system audit trail logs."""
    stmt = (
        select(AuditLog)
        .options(selectinload(AuditLog.user))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    logs = res.scalars().all()

    return [
        {
            "id": str(log.id),
            "user_email": log.user.email if log.user else "System",
            "user_name": log.user.full_name if log.user else "System",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "diff": log.diff,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]


@router.get("/security-events")
async def list_security_events(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """List security logs (login attempts, suspicious scans, suspensions)."""
    stmt = select(SecurityEvent).order_by(SecurityEvent.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    events = res.scalars().all()

    return [
        {
            "id": str(e.id),
            "user_id": str(e.user_id) if e.user_id else None,
            "event_type": e.event_type,
            "ip_address": e.ip_address,
            "details": e.details,
            "created_at": e.created_at.isoformat(),
        }
        for e in events
    ]


@router.get("/policies")
async def list_policies(
    current_user: User = Depends(require_dept_admin),
    db: AsyncSession = Depends(get_db),
):
    """List attendance policies."""
    stmt = select(AttendancePolicy).options(selectinload(AttendancePolicy.department))
    res = await db.execute(stmt)
    policies = res.scalars().all()

    return [
        {
            "id": str(p.id),
            "department_id": str(p.department_id),
            "department_name": p.department.name if p.department else "Default",
            "minimum_percentage": p.minimum_percentage,
            "late_weight": p.late_weight,
            "allowed_late_minutes": p.allowed_late_minutes,
            "grace_period_seconds": p.grace_period_seconds,
        }
        for p in policies
    ]


@router.put("/policies/{policy_id}")
async def update_policy(
    policy_id: str,
    req: AttendancePolicyUpdate,
    current_user: User = Depends(require_dept_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update attendance policy parameters for department."""
    import uuid as _uuid
    try:
        p_uuid = _uuid.UUID(policy_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid policy ID.")

    policy = await db.get(AttendancePolicy, p_uuid)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found.")

    policy.minimum_percentage = req.minimum_percentage
    policy.late_weight = req.late_weight
    policy.allowed_late_minutes = req.allowed_late_minutes
    policy.grace_period_seconds = req.grace_period_seconds

    # Audit log
    audit = AuditLog(
        university_id=current_user.university_id,
        user_id=current_user.id,
        action="UPDATE_ATTENDANCE_POLICY",
        entity_type="ATTENDANCE_POLICY",
        entity_id=str(policy.id),
        diff={
            "minimum_percentage": req.minimum_percentage,
            "late_weight": req.late_weight,
            "allowed_late_minutes": req.allowed_late_minutes,
            "grace_period_seconds": req.grace_period_seconds,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(policy)

    return {
        "id": str(policy.id),
        "department_id": str(policy.department_id),
        "minimum_percentage": policy.minimum_percentage,
        "late_weight": policy.late_weight,
        "allowed_late_minutes": policy.allowed_late_minutes,
        "grace_period_seconds": policy.grace_period_seconds,
    }

