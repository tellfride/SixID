from pydantic import BaseModel

from app.schemas.device import (
    OSInfo, CPUInfo, RAMInfo, RAMSlotInfo, StorageInfo, NetworkInfo,
    MotherboardInfo, BIOSInfo, MonitorInfo, PrinterInfo, SoftwareInfo, ServiceInfo,
    LocalUserInfo,
)


class AgentRegisterRequest(BaseModel):
    hostname: str
    agent_version: str | None = None


class AgentRegisterResponse(BaseModel):
    agent_id: str
    message: str


class AgentHeartbeatRequest(BaseModel):
    agent_id: str
    current_user: str | None = None
    hostname: str | None = None


class AgentInventoryRequest(BaseModel):
    agent_id: str
    hostname: str | None = None
    current_user: str | None = None
    domain: str | None = None
    agent_version: str | None = None
    os: OSInfo | None = None
    cpus: list[CPUInfo] = []
    ram: RAMInfo | None = None
    ram_slots: list[RAMSlotInfo] = []
    storage: list[StorageInfo] = []
    networks: list[NetworkInfo] = []
    motherboard: MotherboardInfo | None = None
    bios: BIOSInfo | None = None
    monitors: list[MonitorInfo] = []
    printers: list[PrinterInfo] = []
    software: list[SoftwareInfo] = []
    services: list[ServiceInfo] = []
    local_users: list[LocalUserInfo] = []


class AgentCommandResponse(BaseModel):
    id: int
    command: str
    params: dict | None = None


class AgentCommandResultRequest(BaseModel):
    agent_id: str
    command_id: int
    success: bool
    result: str | None = None
