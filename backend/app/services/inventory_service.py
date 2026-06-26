import uuid
from datetime import datetime, timezone, timedelta

from app.config import TIMEZONE_BR

from sqlalchemy.orm import Session

from app.models.device import Device, DeviceStatus
from app.models.inventory import (
    DeviceOS, DeviceCPU, DeviceRAM, DeviceRAMSlot, DeviceStorage,
    DeviceNetwork, DeviceMotherboard, DeviceBIOS, DeviceMonitor,
    DevicePrinter, DeviceSoftware, DeviceService, DeviceLocalUser,
)
from app.models.tracking import HardwareChange
from app.schemas.agent import AgentInventoryRequest


def register_device(db: Session, hostname: str, agent_version: str | None) -> str:
    agent_id = str(uuid.uuid4())
    device = Device(
        agent_id=agent_id,
        hostname=hostname,
        status=DeviceStatus.ONLINE,
        last_seen=datetime.now(TIMEZONE_BR),
        agent_version=agent_version,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return agent_id


def process_heartbeat(db: Session, agent_id: str, current_user: str | None, hostname: str | None):
    device = db.query(Device).filter(Device.agent_id == agent_id).first()
    if not device:
        return False
    device.status = DeviceStatus.ONLINE
    device.last_seen = datetime.now(TIMEZONE_BR)
    if current_user:
        device.current_user = current_user
    if hostname:
        device.hostname = hostname
    db.commit()
    return True


TRACKED_COMPONENTS = {"system", "os", "cpu", "ram", "ram_slot", "storage", "motherboard", "bios", "monitor", "local_user"}
IGNORED_FIELDS = {"used_gb", "free_gb", "used_gb", "status", "memory_percent", "updated_at", "last_logon", "profile_path"}


def _track_change(db: Session, device_id: int, component: str, field: str, old_val, new_val):
    if component not in TRACKED_COMPONENTS:
        return
    if field in IGNORED_FIELDS:
        return
    if str(old_val or "") != str(new_val or ""):
        db.add(HardwareChange(
            device_id=device_id,
            component=component,
            field_name=field,
            old_value=str(old_val) if old_val is not None else None,
            new_value=str(new_val) if new_val is not None else None,
        ))


def _update_single(db: Session, device: Device, component: str, model_cls, data, rel_attr: str):
    existing = getattr(device, rel_attr)
    if data is None:
        return
    data_dict = data.model_dump() if hasattr(data, "model_dump") else data
    if existing:
        for field, new_val in data_dict.items():
            old_val = getattr(existing, field, None)
            _track_change(db, device.id, component, field, old_val, new_val)
            setattr(existing, field, new_val)
    else:
        obj = model_cls(device_id=device.id, **data_dict)
        db.add(obj)


def _update_list(db: Session, device: Device, component: str, model_cls, items: list, rel_attr: str, key_field: str):
    existing_list = getattr(device, rel_attr)
    existing_map = {getattr(e, key_field): e for e in existing_list if getattr(e, key_field)}

    new_keys = set()
    for item in items:
        item_dict = item.model_dump() if hasattr(item, "model_dump") else item
        key = item_dict.get(key_field)
        if not key:
            obj = model_cls(device_id=device.id, **item_dict)
            db.add(obj)
            continue
        new_keys.add(key)
        if key in existing_map:
            existing_obj = existing_map[key]
            for field, new_val in item_dict.items():
                old_val = getattr(existing_obj, field, None)
                _track_change(db, device.id, component, field, old_val, new_val)
                setattr(existing_obj, field, new_val)
        else:
            _track_change(db, device.id, component, key_field, None, key)
            obj = model_cls(device_id=device.id, **item_dict)
            db.add(obj)

    for key, existing_obj in existing_map.items():
        if key not in new_keys:
            _track_change(db, device.id, component, key_field, key, None)
            db.delete(existing_obj)


def process_inventory(db: Session, data: AgentInventoryRequest):
    device = db.query(Device).filter(Device.agent_id == data.agent_id).first()
    if not device:
        return False

    if data.hostname:
        _track_change(db, device.id, "system", "hostname", device.hostname, data.hostname)
        device.hostname = data.hostname
    if data.current_user is not None:
        device.current_user = data.current_user
    if data.domain is not None:
        _track_change(db, device.id, "system", "domain", device.domain, data.domain)
        device.domain = data.domain
    if data.agent_version:
        device.agent_version = data.agent_version
    device.status = DeviceStatus.ONLINE
    device.last_seen = datetime.now(TIMEZONE_BR)

    _update_single(db, device, "os", DeviceOS, data.os, "os_info")
    _update_single(db, device, "motherboard", DeviceMotherboard, data.motherboard, "motherboard")
    _update_single(db, device, "bios", DeviceBIOS, data.bios, "bios")
    _update_single(db, device, "ram", DeviceRAM, data.ram, "ram")

    _update_list(db, device, "cpu", DeviceCPU, data.cpus, "cpus", "model")
    _update_list(db, device, "ram_slot", DeviceRAMSlot, data.ram_slots, "ram_slots", "slot")
    _update_list(db, device, "storage", DeviceStorage, data.storage, "storage", "serial")
    _update_list(db, device, "network", DeviceNetwork, data.networks, "networks", "mac_address")
    _update_list(db, device, "monitor", DeviceMonitor, data.monitors, "monitors", "serial")
    _update_list(db, device, "printer", DevicePrinter, data.printers, "printers", "name")
    _update_list(db, device, "software", DeviceSoftware, data.software, "software", "name")
    _update_list(db, device, "service", DeviceService, data.services, "services", "name")
    _update_list(db, device, "local_user", DeviceLocalUser, data.local_users, "local_users", "username")

    db.commit()
    return True
