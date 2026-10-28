import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.models.notification import Notification, NotificationPreference


class NotificationService:
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: uuid.UUID,
        title: str,
        message: str,
        type: str = "INFO",
        link: Optional[str] = None,
    ) -> Notification:
        """Create database-backed in-app notification."""
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            link=link,
        )
        db.add(notif)
        await db.commit()
        await db.refresh(notif)
        return notif

    @staticmethod
    async def check_and_send_low_attendance_warning(
        db: AsyncSession,
        student_user_id: uuid.UUID,
        course_name: str,
        current_percentage: float,
        threshold: float = 75.0,
    ) -> Optional[Notification]:
        """Trigger alert if student attendance percentage drops below configured threshold."""
        if current_percentage < threshold:
            title = f"Low Attendance Warning: {course_name}"
            msg = (
                f"Your current attendance in {course_name} is {current_percentage}%, "
                f"which is below the required {threshold}% threshold. Please attend upcoming sessions to avoid debarment."
            )
            return await NotificationService.create_notification(
                db=db,
                user_id=student_user_id,
                title=title,
                message=msg,
                type="WARNING",
                link="/student/courses",
            )
        return None
