from datetime import datetime

from sqlalchemy import String, Integer, Float, Text, Boolean, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.config import TIMEZONE_BR


class Printer(Base):
    __tablename__ = "printers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    model: Mapped[str | None] = mapped_column(String(255))
    serial_number: Mapped[str | None] = mapped_column(String(255))
    ip_address: Mapped[str | None] = mapped_column(String(45))
    location: Mapped[str | None] = mapped_column(String(255))
    sector: Mapped[str | None] = mapped_column(String(255))
    printer_number: Mapped[str | None] = mapped_column(String(50))
    snmp_community: Mapped[str] = mapped_column(String(100), default="public")
    snmp_version: Mapped[str] = mapped_column(String(5), default="v2c")
    initial_counter: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(TIMEZONE_BR))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(TIMEZONE_BR), onupdate=lambda: datetime.now(TIMEZONE_BR))

    counters: Mapped[list["PrinterCounter"]] = relationship(back_populates="printer", cascade="all, delete-orphan")
    toner_changes: Mapped[list["TonerChange"]] = relationship(back_populates="printer", cascade="all, delete-orphan")


class PrinterCounter(Base):
    __tablename__ = "printer_counters"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    printer_id: Mapped[int] = mapped_column(ForeignKey("printers.id", ondelete="CASCADE"), index=True)
    total_pages: Mapped[int] = mapped_column(Integer, default=0)
    color_pages: Mapped[int | None] = mapped_column(Integer)
    bw_pages: Mapped[int | None] = mapped_column(Integer)
    collected_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(TIMEZONE_BR))
    source: Mapped[str] = mapped_column(String(20), default="snmp")

    printer = relationship("Printer", back_populates="counters")


class TonerChange(Base):
    __tablename__ = "toner_changes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    printer_id: Mapped[int] = mapped_column(ForeignKey("printers.id", ondelete="CASCADE"), index=True)
    toner_model: Mapped[str] = mapped_column(String(255))
    changed_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    pages_at_change: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(TIMEZONE_BR))

    printer = relationship("Printer", back_populates="toner_changes")
    user = relationship("User")


class TonerStock(Base):
    __tablename__ = "toner_stock"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    toner_model: Mapped[str] = mapped_column(String(255), unique=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    min_quantity: Mapped[int] = mapped_column(Integer, default=2)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(TIMEZONE_BR), onupdate=lambda: datetime.now(TIMEZONE_BR))


class TonerStockLog(Base):
    __tablename__ = "toner_stock_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    toner_model: Mapped[str] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(20))
    quantity: Mapped[int] = mapped_column(Integer)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    printer_id: Mapped[int | None] = mapped_column(ForeignKey("printers.id", ondelete="SET NULL"))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(TIMEZONE_BR))

    user = relationship("User")
    printer = relationship("Printer")
