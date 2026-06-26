from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, case, literal
from sqlalchemy.orm import Session

from app.config import TIMEZONE_BR
from app.database import get_db
from app.models.device import Device, DeviceStatus
from app.models.inventory import DeviceOS, DeviceStorage, DeviceRAM, DeviceSoftware, DeviceCPU
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
    rows = (db.query(Branch.name, func.count(Device.id))
            .join(Sector, Branch.id == Sector.branch_id)
            .join(Device, Sector.id == Device.room_id)
            .group_by(Branch.name).all())
    return DashboardChartData(data=[
        ChartDataPoint(label=name, value=count) for name, count in rows
    ])


@router.get("/devices-per-floor")
def get_devices_per_floor(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (db.query(
        Branch.id, Branch.name, Company.name.label('company'),
        func.count(Device.id).label('count'),
    )
    .join(Sector, Branch.id == Sector.branch_id)
    .join(Device, Sector.id == Device.room_id)
    .join(Company, Branch.company_id == Company.id)
    .group_by(Branch.id, Branch.name, Company.name)
    .order_by(func.count(Device.id).desc()).all())

    return [{"branch_id": r[0], "floor": r[1], "company": r[2], "count": r[3]} for r in rows]


@router.get("/devices-by-floor")
def get_devices_by_floor(branch_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (db.query(Device.id, Device.hostname, Device.current_user, Device.status,
                     Device.last_seen, Sector.name.label('sector'))
            .join(Sector, Device.room_id == Sector.id)
            .filter(Sector.branch_id == branch_id)
            .order_by(Sector.name, Device.hostname).all())
    return [
        {"id": r[0], "hostname": r[1], "current_user": r[2],
         "status": r[3].value if r[3] else "unknown",
         "last_seen": r[4].isoformat() if r[4] else None,
         "sector": r[5]}
        for r in rows
    ]


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


@router.get("/os-details")
def get_os_details(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (db.query(DeviceOS.name, func.count(DeviceOS.id))
            .group_by(DeviceOS.name).order_by(func.count(DeviceOS.id).desc()).all())
    return [{"os_name": name or "Desconhecido", "count": count} for name, count in rows]


@router.get("/os-devices")
def get_devices_by_os(os_name: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (db.query(Device.id, Device.hostname, Device.current_user, Device.status,
                     Device.last_seen, DeviceOS.name, DeviceOS.version, DeviceOS.build)
            .join(DeviceOS, Device.id == DeviceOS.device_id)
            .filter(DeviceOS.name == os_name)
            .order_by(Device.hostname).all())
    return [
        {"id": r[0], "hostname": r[1], "current_user": r[2], "status": r[3].value if r[3] else "unknown",
         "last_seen": r[4].isoformat() if r[4] else None,
         "os_name": r[5], "os_version": r[6], "os_build": r[7]}
        for r in rows
    ]


@router.get("/hardware-ranking")
def get_hardware_ranking(db: Session = Depends(get_db), _=Depends(get_current_user)):
    ram_rows = (db.query(Device.id, Device.hostname, Device.status, DeviceRAM.total_gb)
                .join(DeviceRAM, Device.id == DeviceRAM.device_id)
                .filter(DeviceRAM.total_gb != None)
                .order_by(DeviceRAM.total_gb.desc()).all())
    ram_ranking = [
        {"id": r[0], "hostname": r[1], "status": r[2].value if r[2] else "unknown", "ram_gb": round(r[3], 1)}
        for r in ram_rows
    ]

    storage_rows = (db.query(Device.id, Device.hostname, DeviceStorage.media_type,
                             DeviceStorage.model, DeviceStorage.capacity_gb)
                    .join(DeviceStorage, Device.id == DeviceStorage.device_id)
                    .filter(DeviceStorage.capacity_gb != None)
                    .order_by(DeviceStorage.capacity_gb.desc()).all())
    storage_ranking = [
        {"id": r[0], "hostname": r[1], "media_type": r[2] or "HDD",
         "model": r[3] or "-", "capacity_gb": round(r[4], 1)}
        for r in storage_rows
    ]

    return {"ram": ram_ranking, "storage": storage_ranking}


@router.get("/devices-by-ram")
def get_devices_by_ram(ram_label: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    ranges = {"≤4 GB": (0, 4.9), "8 GB": (5, 8.9), "16 GB": (9, 16.9), "32 GB": (17, 32.9), "64+ GB": (33, 99999)}
    low, high = ranges.get(ram_label, (0, 99999))
    rows = (db.query(Device.id, Device.hostname, Device.current_user, Device.status,
                     Device.last_seen, DeviceRAM.total_gb)
            .join(DeviceRAM, Device.id == DeviceRAM.device_id)
            .filter(DeviceRAM.total_gb >= low, DeviceRAM.total_gb <= high)
            .order_by(Device.hostname).all())
    return [
        {"id": r[0], "hostname": r[1], "current_user": r[2],
         "status": r[3].value if r[3] else "unknown",
         "last_seen": r[4].isoformat() if r[4] else None,
         "ram_gb": round(r[5], 1)}
        for r in rows
    ]


@router.get("/devices-by-storage-type")
def get_devices_by_storage_type(media_type: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (db.query(Device.id, Device.hostname, Device.current_user, Device.status,
                     DeviceStorage.model, DeviceStorage.capacity_gb, DeviceStorage.used_gb,
                     DeviceStorage.free_gb, DeviceStorage.health, DeviceStorage.media_type)
            .join(DeviceStorage, Device.id == DeviceStorage.device_id)
            .filter(DeviceStorage.media_type == media_type)
            .order_by(Device.hostname).all())
    return [
        {"id": r[0], "hostname": r[1], "current_user": r[2],
         "status": r[3].value if r[3] else "unknown",
         "model": r[4] or "-", "capacity_gb": round(r[5] or 0, 1),
         "used_gb": round(r[6] or 0, 1), "free_gb": round(r[7] or 0, 1),
         "health": r[8] or "-", "media_type": r[9] or "-"}
        for r in rows
    ]


@router.get("/storage-capacity")
def get_storage_capacity(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (db.query(Device.id, Device.hostname, DeviceStorage.media_type,
                     DeviceStorage.model, DeviceStorage.capacity_gb,
                     DeviceStorage.used_gb, DeviceStorage.free_gb, DeviceStorage.health)
            .join(DeviceStorage, Device.id == DeviceStorage.device_id)
            .filter(DeviceStorage.capacity_gb != None, DeviceStorage.capacity_gb > 0)
            .order_by(DeviceStorage.capacity_gb.desc()).all())
    result = []
    for r in rows:
        capacity = r[4] or 0
        used = r[5] or 0
        usage_pct = round((used / capacity) * 100, 1) if capacity > 0 else 0
        result.append({
            "id": r[0], "hostname": r[1], "media_type": r[2] or "HDD",
            "model": r[3] or "-", "capacity_gb": round(capacity, 1),
            "used_gb": round(used, 1), "free_gb": round(r[6] or 0, 1),
            "usage_pct": usage_pct, "health": r[7] or "-",
        })
    return result
