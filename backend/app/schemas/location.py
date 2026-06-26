from datetime import datetime

from pydantic import BaseModel


class UnitCreate(BaseModel):
    name: str
    description: str | None = None


class UnitResponse(BaseModel):
    id: int
    name: str
    description: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class CompanyCreate(BaseModel):
    name: str
    unit_id: int


class CompanyResponse(BaseModel):
    id: int
    name: str
    unit_id: int
    created_at: datetime
    model_config = {"from_attributes": True}


class BranchCreate(BaseModel):
    name: str
    address: str | None = None
    company_id: int


class BranchResponse(BaseModel):
    id: int
    name: str
    address: str | None
    company_id: int
    created_at: datetime
    model_config = {"from_attributes": True}


class SectorCreate(BaseModel):
    name: str
    floor: str | None = None
    branch_id: int


class SectorResponse(BaseModel):
    id: int
    name: str
    floor: str | None
    branch_id: int
    created_at: datetime
    model_config = {"from_attributes": True}


class RoomCreate(BaseModel):
    name: str
    sector_id: int


class RoomResponse(BaseModel):
    id: int
    name: str
    sector_id: int
    created_at: datetime
    model_config = {"from_attributes": True}


class ResponsibleCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    room_id: int


class ResponsibleResponse(BaseModel):
    id: int
    name: str
    email: str | None
    phone: str | None
    room_id: int
    created_at: datetime
    model_config = {"from_attributes": True}


class UnitUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class CompanyUpdate(BaseModel):
    name: str | None = None
    unit_id: int | None = None


class BranchUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    company_id: int | None = None


class SectorUpdate(BaseModel):
    name: str | None = None
    floor: str | None = None
    branch_id: int | None = None


class RoomUpdate(BaseModel):
    name: str | None = None
    sector_id: int | None = None


class LocationTreeNode(BaseModel):
    id: int
    name: str
    type: str
    children: list["LocationTreeNode"] = []

    model_config = {"from_attributes": True}
