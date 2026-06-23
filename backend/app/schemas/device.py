from datetime import datetime

from pydantic import BaseModel

from app.models.device import DeviceStatus


class DeviceResponse(BaseModel):
    id: int
    agent_id: str
    hostname: str
    current_user: str | None
    domain: str | None
    status: DeviceStatus
    last_seen: datetime | None
    agent_version: str | None
    room_id: int | None
    responsible_person_id: int | None
    created_at: datetime
    location_path: str | None = None

    model_config = {"from_attributes": True}


class DeviceUpdate(BaseModel):
    room_id: int | None = None
    responsible_person_id: int | None = None


class _ORMBase(BaseModel):
    model_config = {"from_attributes": True}


class OSInfo(_ORMBase):
    name: str | None = None
    version: str | None = None
    build: str | None = None
    architecture: str | None = None
    product_key: str | None = None


class CPUInfo(_ORMBase):
    manufacturer: str | None = None
    model: str | None = None
    cores: int | None = None
    threads: int | None = None
    frequency_mhz: int | None = None


class RAMInfo(_ORMBase):
    total_gb: float | None = None
    used_gb: float | None = None
    free_gb: float | None = None


class RAMSlotInfo(_ORMBase):
    slot: str | None = None
    size_gb: float | None = None
    type: str | None = None
    speed_mhz: int | None = None
    manufacturer: str | None = None


class StorageInfo(_ORMBase):
    media_type: str | None = None
    model: str | None = None
    serial: str | None = None
    capacity_gb: float | None = None
    used_gb: float | None = None
    free_gb: float | None = None
    health: str | None = None


class NetworkInfo(_ORMBase):
    adapter_name: str | None = None
    ip_address: str | None = None
    mac_address: str | None = None
    gateway: str | None = None
    dns: str | None = None
    adapter_type: str | None = None


class MotherboardInfo(_ORMBase):
    manufacturer: str | None = None
    model: str | None = None
    serial: str | None = None


class BIOSInfo(_ORMBase):
    manufacturer: str | None = None
    version: str | None = None
    date: str | None = None


class MonitorInfo(_ORMBase):
    manufacturer: str | None = None
    model: str | None = None
    serial: str | None = None


class PrinterInfo(_ORMBase):
    name: str | None = None
    driver: str | None = None
    port: str | None = None
    is_default: bool | None = None


class SoftwareInfo(_ORMBase):
    name: str | None = None
    version: str | None = None
    publisher: str | None = None
    install_date: str | None = None


class ServiceInfo(_ORMBase):
    name: str | None = None
    display_name: str | None = None
    status: str | None = None
    start_type: str | None = None


class LocalUserInfo(_ORMBase):
    username: str | None = None
    full_name: str | None = None
    is_admin: bool | None = None
    is_active: bool | None = None
    source: str | None = None
    domain: str | None = None
    last_logon: str | None = None
    profile_path: str | None = None


class DeviceDetailResponse(DeviceResponse):
    os_info: OSInfo | None = None
    cpus: list[CPUInfo] = []
    ram: RAMInfo | None = None
    ram_slots: list[RAMSlotInfo] = []
    storage: list[StorageInfo] = []
    networks: list[NetworkInfo] = []
    motherboard: MotherboardInfo | None = None
    bios: BIOSInfo | None = None
    monitors: list[MonitorInfo] = []
    printers: list[PrinterInfo] = []
    local_users: list[LocalUserInfo] = []


class HardwareChangeResponse(BaseModel):
    id: int
    component: str
    field_name: str
    old_value: str | None
    new_value: str | None
    detected_at: datetime

    model_config = {"from_attributes": True}
