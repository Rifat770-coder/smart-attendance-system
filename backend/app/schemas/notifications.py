import uuid
import datetime as dt
from typing import Optional
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: uuid.UUID
    title: str
    message: str
    type: str
    link: Optional[str] = None
    read_at: Optional[dt.datetime] = None
    created_at: dt.datetime

    class Config:
        from_attributes = True


class NotificationPreferenceUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    min_threshold_alert: Optional[float] = None
