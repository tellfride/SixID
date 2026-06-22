from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.location import Unit, Company, Branch, Sector, Room, ResponsiblePerson
from app.models.user import UserRole
from app.schemas.location import (
    UnitCreate, UnitResponse, CompanyCreate, CompanyResponse,
    BranchCreate, BranchResponse, SectorCreate, SectorResponse,
    RoomCreate, RoomResponse, ResponsibleCreate, ResponsibleResponse,
    LocationTreeNode,
)
from app.utils.security import require_role

router = APIRouter(prefix="/api/locations", tags=["Locations"])


@router.get("/tree", response_model=list[LocationTreeNode])
def get_location_tree(db: Session = Depends(get_db), _=Depends(require_role(UserRole.VIEWER))):
    units = db.query(Unit).all()
    tree = []
    for unit in units:
        companies_nodes = []
        for company in unit.companies:
            branches_nodes = []
            for branch in company.branches:
                sectors_nodes = []
                for sector in branch.sectors:
                    rooms_nodes = [
                        LocationTreeNode(id=room.id, name=room.name, type="room")
                        for room in sector.rooms
                    ]
                    sectors_nodes.append(LocationTreeNode(id=sector.id, name=f"{sector.name} (Andar: {sector.floor or '-'})", type="sector", children=rooms_nodes))
                branches_nodes.append(LocationTreeNode(id=branch.id, name=branch.name, type="branch", children=sectors_nodes))
            companies_nodes.append(LocationTreeNode(id=company.id, name=company.name, type="company", children=branches_nodes))
        tree.append(LocationTreeNode(id=unit.id, name=unit.name, type="unit", children=companies_nodes))
    return tree


@router.get("/rooms-flat")
def list_rooms_flat(db: Session = Depends(get_db), _=Depends(require_role(UserRole.VIEWER))):
    rooms = db.query(Room).all()
    result = []
    for room in rooms:
        sector = db.query(Sector).filter(Sector.id == room.sector_id).first()
        branch = db.query(Branch).filter(Branch.id == sector.branch_id).first() if sector else None
        company = db.query(Company).filter(Company.id == branch.company_id).first() if branch else None
        unit = db.query(Unit).filter(Unit.id == company.unit_id).first() if company else None
        parts = [p.name for p in [unit, company, branch, sector, room] if p]
        result.append({"id": room.id, "full_path": " > ".join(parts)})
    return result


# --- Units ---
@router.get("/units", response_model=list[UnitResponse])
def list_units(db: Session = Depends(get_db), _=Depends(require_role(UserRole.VIEWER))):
    return db.query(Unit).all()

@router.post("/units", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
def create_unit(data: UnitCreate, db: Session = Depends(get_db), _=Depends(require_role(UserRole.TECHNICIAN))):
    obj = Unit(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/units/{unit_id}", status_code=204)
def delete_unit(unit_id: int, db: Session = Depends(get_db), _=Depends(require_role(UserRole.ADMIN))):
    obj = db.query(Unit).filter(Unit.id == unit_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(obj)
    db.commit()


# --- Companies ---
@router.get("/companies", response_model=list[CompanyResponse])
def list_companies(unit_id: int | None = None, db: Session = Depends(get_db), _=Depends(require_role(UserRole.VIEWER))):
    q = db.query(Company)
    if unit_id:
        q = q.filter(Company.unit_id == unit_id)
    return q.all()

@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(data: CompanyCreate, db: Session = Depends(get_db), _=Depends(require_role(UserRole.TECHNICIAN))):
    obj = Company(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/companies/{company_id}", status_code=204)
def delete_company(company_id: int, db: Session = Depends(get_db), _=Depends(require_role(UserRole.ADMIN))):
    obj = db.query(Company).filter(Company.id == company_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(obj)
    db.commit()


# --- Branches ---
@router.get("/branches", response_model=list[BranchResponse])
def list_branches(company_id: int | None = None, db: Session = Depends(get_db), _=Depends(require_role(UserRole.VIEWER))):
    q = db.query(Branch)
    if company_id:
        q = q.filter(Branch.company_id == company_id)
    return q.all()

@router.post("/branches", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
def create_branch(data: BranchCreate, db: Session = Depends(get_db), _=Depends(require_role(UserRole.TECHNICIAN))):
    obj = Branch(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/branches/{branch_id}", status_code=204)
def delete_branch(branch_id: int, db: Session = Depends(get_db), _=Depends(require_role(UserRole.ADMIN))):
    obj = db.query(Branch).filter(Branch.id == branch_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(obj)
    db.commit()


# --- Sectors ---
@router.get("/sectors", response_model=list[SectorResponse])
def list_sectors(branch_id: int | None = None, db: Session = Depends(get_db), _=Depends(require_role(UserRole.VIEWER))):
    q = db.query(Sector)
    if branch_id:
        q = q.filter(Sector.branch_id == branch_id)
    return q.all()

@router.post("/sectors", response_model=SectorResponse, status_code=status.HTTP_201_CREATED)
def create_sector(data: SectorCreate, db: Session = Depends(get_db), _=Depends(require_role(UserRole.TECHNICIAN))):
    obj = Sector(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/sectors/{sector_id}", status_code=204)
def delete_sector(sector_id: int, db: Session = Depends(get_db), _=Depends(require_role(UserRole.ADMIN))):
    obj = db.query(Sector).filter(Sector.id == sector_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(obj)
    db.commit()


# --- Rooms ---
@router.get("/rooms", response_model=list[RoomResponse])
def list_rooms(sector_id: int | None = None, db: Session = Depends(get_db), _=Depends(require_role(UserRole.VIEWER))):
    q = db.query(Room)
    if sector_id:
        q = q.filter(Room.sector_id == sector_id)
    return q.all()

@router.post("/rooms", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(data: RoomCreate, db: Session = Depends(get_db), _=Depends(require_role(UserRole.TECHNICIAN))):
    obj = Room(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/rooms/{room_id}", status_code=204)
def delete_room(room_id: int, db: Session = Depends(get_db), _=Depends(require_role(UserRole.ADMIN))):
    obj = db.query(Room).filter(Room.id == room_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(obj)
    db.commit()


# --- Responsible Persons ---
@router.get("/responsible", response_model=list[ResponsibleResponse])
def list_responsible(room_id: int | None = None, db: Session = Depends(get_db), _=Depends(require_role(UserRole.VIEWER))):
    q = db.query(ResponsiblePerson)
    if room_id:
        q = q.filter(ResponsiblePerson.room_id == room_id)
    return q.all()

@router.post("/responsible", response_model=ResponsibleResponse, status_code=status.HTTP_201_CREATED)
def create_responsible(data: ResponsibleCreate, db: Session = Depends(get_db), _=Depends(require_role(UserRole.TECHNICIAN))):
    obj = ResponsiblePerson(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/responsible/{person_id}", status_code=204)
def delete_responsible(person_id: int, db: Session = Depends(get_db), _=Depends(require_role(UserRole.ADMIN))):
    obj = db.query(ResponsiblePerson).filter(ResponsiblePerson.id == person_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(obj)
    db.commit()
