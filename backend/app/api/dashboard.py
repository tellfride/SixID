from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, case, literal
from sqlalchemy.orm import Session

from app.config import TIMEZONE_BR
from app.database import get_db
from app.models.device import Device, DeviceStatus
from app.models.inventory import DeviceOS, DeviceStorage, DeviceRAM, DeviceSoftware
from app.models.tracking import HardwareChange
from app.models.location import Room, Sector, Branch, Company, Unit
from app.schemas.dashboard import (
    DashboardStats, ChartDataPoint, AlertHistoryPoint, DashboardChartData,
    DiskHealthItem, TopSoftwareItem,
)
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

    now = datetime.now(TIMEZONE_BR)
    if total > 0:
        avg_uptime = round((online / total) * 100, 1)
    else:
        avg_uptime = 0.0

    offline_devices = db.query(Device).filter(Device.status == DeviceStatus.OFFLINE, Device.last_seen != None).all()
    if offline_devices:
        total_hours = sum(
            (now - d.last_seen.replace(tzinfo=TIMEZONE_BR) if d.last_seen.tzinfo is None else now - d.last_seen).total_seconds() / 3600
            for d in offline_devices
        )
        avg_offline_hours = round(total_hours / len(offline_devices), 1)
    else:
        avg_offline_hours = 0.0

    return DashboardStats(
        total_devices=total, online=online, offline=offline,
        alerts=alerts, recent_changes=recent_changes,
        avg_uptime_percent=avg_uptime, avg_offline_hours=avg_offline_hours,
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


@router.get("/ram-distribution", response_model=DashboardChartData)
def get_ram_distribution(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(DeviceRAM.total_gb).filter(DeviceRAM.total_gb != None).all()
    buckets: dict[str, int] = {}
    for (total_gb,) in rows:
        if total_gb is None:
            continue
        gb = round(total_gb)
        if gb <= 4:
            label = "≤4 GB"
        elif gb <= 8:
            label = "8 GB"
        elif gb <= 16:
            label = "16 GB"
        elif gb <= 32:
            label = "32 GB"
        else:
            label = "64+ GB"
        buckets[label] = buckets.get(label, 0) + 1
    order = ["≤4 GB", "8 GB", "16 GB", "32 GB", "64+ GB"]
    return DashboardChartData(data=[
        ChartDataPoint(label=k, value=buckets.get(k, 0)) for k in order if buckets.get(k, 0) > 0
    ])


@router.get("/disk-health", response_model=list[DiskHealthItem])
def get_disk_health(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (db.query(Device.hostname, DeviceStorage.model, DeviceStorage.capacity_gb,
                     DeviceStorage.health, DeviceStorage.media_type)
            .join(DeviceStorage, Device.id == DeviceStorage.device_id)
            .filter(DeviceStorage.capacity_gb != None)
            .order_by(Device.hostname).all())
    return [
        DiskHealthItem(
            hostname=hostname, model=model or "Desconhecido",
            capacity_gb=round(capacity_gb or 0, 1),
            health=health or "Desconhecido",
            media_type=media_type or "HDD",
        )
        for hostname, model, capacity_gb, health, media_type in rows
    ]


@router.get("/top-software", response_model=list[TopSoftwareItem])
def get_top_software(limit: int = 10, db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (db.query(DeviceSoftware.name, func.count(DeviceSoftware.id).label("cnt"))
            .filter(DeviceSoftware.name != None, DeviceSoftware.name != "")
            .group_by(DeviceSoftware.name)
            .order_by(func.count(DeviceSoftware.id).desc())
            .limit(limit).all())
    return [TopSoftwareItem(name=name, count=count) for name, count in rows]
