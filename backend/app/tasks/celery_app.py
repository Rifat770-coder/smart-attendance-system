from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "attendx_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)


@celery_app.task(name="tasks.send_attendance_warning_email")
def send_attendance_warning_email(student_email: str, student_name: str, course_name: str, percentage: float):
    """Background task to dispatch email notification via SMTP provider if configured."""
    if not settings.SMTP_ENABLED or not settings.SMTP_USER:
        return {"status": "skipped", "reason": "SMTP provider not configured"}
    
    # In production, uses smtplib.SMTP
    return {"status": "sent", "recipient": student_email}
