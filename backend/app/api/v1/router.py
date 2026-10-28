from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    academic,
    attendance,
    qr,
    corrections,
    reports,
    notifications,
    admin,
    websocket,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(academic.router, prefix="/academic", tags=["Academic Management"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["Attendance Sessions"])
api_router.include_router(qr.router, prefix="/qr", tags=["Dynamic QR Code"])
api_router.include_router(corrections.router, prefix="/corrections", tags=["Attendance Corrections"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports & Analytics"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(admin.router, prefix="/admin", tags=["System Administration"])
api_router.include_router(websocket.router, prefix="/ws", tags=["Real-Time WebSockets"])
