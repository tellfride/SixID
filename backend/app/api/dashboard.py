from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import TIMEZONE_BR
from app.database import get_db
from app.models.device import Device, DeviceStatus
from app.models.inventory import DeviceOS, DeviceStorage
from app.models.tracking import HardwareChange
from app.models.location import Room, Sector, Branch, Company, Unit
from app.schemas.dashboard import DashboardStats, ChartDataPoint, AlertHistoryPoint, DashboardChartData
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db), _=Depends(get_current_user)):
    total = db.query(func.count(Device.id)).scalar() or 0
    online = db.query(func.count(Device.id)).filter(Device.status == DeviceStatus.ONLINE).scalar() or 0
    offline = db.query(func.count(Device.id)).filter(Device.status == DeviceStatus.OFFLINE).scalar() or 0

    threshold = datetime.now(TIMEZONE_BR) - timedelta(hours=24)
    alerts = db.query(func.count(Device.id)).filter(
        Device.status == DeviceStatus.OFFLINE,
        Device.last_seen < threshold
    ).scalar() or 0

    week_ago = datetime.now(TIMEZONE_BR) - timedelta(days=7)
    recent_changes = db.query(func.count(HardwareChange.id)).filter(
        HardwareChange.detected_at >= week_ago
    ).scalar() or 0

    return DashboardStats(
        total_devices=total, online=online, offline=offline,
        alerts=alerts, recent_changes=recent_changes,
    )


@router.get("/os-distribution", response_model=DashboardChartData)
def get_os_distribution(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (db.query(DeviceOS.name, func.count(DeviceOS.id))
            .group_by(DeviceOS.name).all())
    return DashboardChartData(data=[
        ChartDataPoint(label=name or "Unknown", value=count)
        for name, count in rows
    ])


@router.get("/storage-usage", response_model=DashboardChartData)
def get_storage_usage(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (db.query(DeviceStorage.media_type, func.count(DeviceStorage.id))
            .group_by(DeviceStorage.media_type).all())
    return DashboardChartData(data=[
        ChartDataPoint(label=media or "Unknown", value=count)
        for media, count in rows
    ])


@router.get("/devices-per-unit", response_model=DashboardChartData)
def get_devices_per_unit(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (db.query(Unit.name, func.count(Device.id))
            .join(Company, Unit.id == Company.unit_id)
            .join(Branch, Company.id == Branch.company_id)
            .join(Sector, Branch.id == Sector.branch_id)
            .join(Room, Sector.id == Room.sector_id)
            .join(Device, Room.id == Device.room_id)
            .group_by(Unit.name).all())
    return DashboardChartData(data=[
        ChartDataPoint(label=name, value=count) for name, count in rows
    ])


@router.get("/alert-history", response_model=list[AlertHistoryPoint])
def get_alert_history(days: int = 30, db: Session = Depends(get_db), _=Depends(get_current_user)):
    start = datetime.now(TIMEZONE_BR) - timedelta(days=days)
    rows = (db.query(func.date(HardwareChange.detected_at), func.count(HardwareChange.id))
            .filter(HardwareChange.detected_at >= start)
            .group_by(func.date(HardwareChange.detected_at))
            .order_by(func.date(HardwareChange.detected_at)).all())
    return [AlertHistoryPoint(date=str(d), count=c) for d, c in rows]
