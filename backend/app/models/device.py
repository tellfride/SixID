from datetime import datetime
import enum
from datetime import datetime

from sqlalchemy import String, Enum, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.config import TIMEZONE_BR


class DeviceStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    UNKNOWN = "unknown"


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    agent_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    hostname: Mapped[str] = mapped_column(String(255), index=True)
    current_user: Mapped[str | None] = mapped_column(String(255))
    domain: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[DeviceStatus] = mapped_column(Enum(DeviceStatus), default=DeviceStatus.UNKNOWN)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime)
    agent_version: Mapped[str | None] = mapped_column(String(50))
    room_id: Mapped[int | None] = mapped_column(ForeignKey("rooms.id", ondelete="SET NULL"))
    responsible_person_id: Mapped[int | None] = mapped_column(ForeignKey("responsible_persons.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(TIMEZONE_BR))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(TIMEZONE_BR), onupdate=lambda: datetime.now(TIMEZONE_BR))

    os_info: Mapped["DeviceOS | None"] = relationship(back_populates="device", cascade="all, delete-orphan", uselist=False)
    cpus: Mapped[list["DeviceCPU"]] = relationship(back_populates="device", cascade="all, delete-orphan")
    ram: Mapped["DeviceRAM | None"] = relationship(back_populates="device", cascade="all, delete-orphan", uselist=False)
    ram_slots: Mapped[list["DeviceRAMSlot"]] = relationship(back_populates="device", cascade="all, delete-orphan")
    storage: Mapped[list["DeviceStorage"]] = relationship(back_populates="device", cascade="all, delete-orphan")
    networks: Mapped[list["DeviceNetwork"]] = relationship(back_populates="device", cascade="all, delete-orphan")
    motherboard: Mapped["DeviceMotherboard | None"] = relationship(back_populates="device", cascade="all, delete-orphan", uselist=False)
    bios: Mapped["DeviceBIOS | None"] = relationship(back_populates="device", cascade="all, delete-orphan", uselist=False)
    monitors: Mapped[list["DeviceMonitor"]] = relationship(back_populates="device", cascade="all, delete-orphan")
    printers: Mapped[list["DevicePrinter"]] = relationship(back_populates="device", cascade="all, delete-orphan")
    software: Mapped[list["DeviceSoftware"]] = relationship(back_populates="device", cascade="all, delete-orphan")
    services: Mapped[list["DeviceService"]] = relationship(back_populates="device", cascade="all, delete-orphan")
    local_users: Mapped[list["DeviceLocalUser"]] = relationship(back_populates="device", cascade="all, delete-orphan")
    hardware_changes: Mapped[list["HardwareChange"]] = relationship(back_populates="device", cascade="all, delete-orphan")

    room: Mapped["Room | None"] = relationship()
    responsible_person: Mapped["ResponsiblePerson | None"] = relationship()


from app.models.inventory import (  # noqa: E402
    DeviceOS, DeviceCPU, DeviceRAM, DeviceRAMSlot, DeviceStorage,
    DeviceNetwork, DeviceMotherboard, DeviceBIOS, DeviceMonitor,
    DevicePrinter, DeviceSoftware, DeviceService, DeviceLocalUser,
)
from app.models.tracking import HardwareChange  # noqa: E402
from app.models.location import Room, ResponsiblePerson  # noqa: E402
