from datetime import datetime
from datetime import datetime

from sqlalchemy import String, Integer, Text, Boolean, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.config import TIMEZONE_BR


class HardwareChange(Base):
    __tablename__ = "hardware_changes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id", ondelete="CASCADE"), index=True)
    component: Mapped[str] = mapped_column(String(100))
    field_name: Mapped[str] = mapped_column(String(100))
    old_value: Mapped[str | None] = mapped_column(Text)
    new_value: Mapped[str | None] = mapped_column(Text)
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(TIMEZONE_BR))

    device = relationship("Device", back_populates="hardware_changes")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(100), index=True)
    target_type: Mapped[str | None] = mapped_column(String(100))
    target_id: Mapped[int | None] = mapped_column(Integer)
    details: Mapped[dict | None] = mapped_column(JSON)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(TIMEZONE_BR), index=True)

    user = relationship("User")


class RemoteSession(Base):
    __tablename__ = "remote_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    session_type: Mapped[str] = mapped_column(String(20))
    started_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(TIMEZONE_BR))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime)

    device = relationship("Device")
    user = relationship("User")


class PendingCommand(Base):
    __tablename__ = "pending_commands"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id", ondelete="CASCADE"), index=True)
    command: Mapped[str] = mapped_column(String(100))
    params: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, sent, completed
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(TIMEZONE_BR))
    result: Mapped[str | None] = mapped_column(Text)

    device = relationship("Device")


class DismissedAlert(Base):
    __tablename__ = "dismissed_alerts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    alert_key: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    dismissed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    dismissed_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(TIMEZONE_BR))

    user = relationship("User")


class ScreenLock(Base):
    __tablename__ = "screen_locks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id", ondelete="CASCADE"), index=True)
    locked_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    message: Mapped[str | None] = mapped_column(Text)
    unlock_password_hash: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(TIMEZONE_BR))

    device = relationship("Device")
    user = relationship("User")
