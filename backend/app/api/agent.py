import asyncio

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.device import Device
from app.models.tracking import PendingCommand
from app.schemas.agent import (
    AgentRegisterRequest, AgentRegisterResponse, AgentHeartbeatRequest,
    AgentInventoryRequest, AgentCommandResultRequest,
)
from app.services.inventory_service import register_device, process_heartbeat, process_inventory
from app.utils.security import verify_agent_key
from app.websocket.manager import manager

router = APIRouter(prefix="/api/agent", tags=["Agent"])


@router.post("/register", response_model=AgentRegisterResponse)
def agent_register(
    data: AgentRegisterRequest,
    db: Session = Depends(get_db),
    _=Depends(verify_agent_key),
):
    agent_id = register_device(db, data.hostname, data.agent_version)
    return AgentRegisterResponse(agent_id=agent_id, message="Device registered successfully")


@router.post("/heartbeat")
async def agent_heartbeat(
    data: AgentHeartbeatRequest,
    db: Session = Depends(get_db),
    _=Depends(verify_agent_key),
):
    if not process_heartbeat(db, data.agent_id, data.current_user, data.hostname):
        raise HTTPException(status_code=404, detail="Device not registered")
    device = db.query(Device).filter(Device.agent_id == data.agent_id).first()
    await manager.broadcast_dashboard({
        "type": "heartbeat",
        "agent_id": data.agent_id,
        "device_id": device.id if device else None,
        "hostname": device.hostname if device else data.hostname,
        "current_user": data.current_user,
        "status": "online",
        "last_seen": device.last_seen.isoformat() if device and device.last_seen else None,
    })
    return {"status": "ok"}


@router.post("/inventory")
async def agent_inventory(
    data: AgentInventoryRequest,
    db: Session = Depends(get_db),
    _=Depends(verify_agent_key),
):
    if not process_inventory(db, data):
        raise HTTPException(status_code=404, detail="Device not registered")
    device = db.query(Device).filter(Device.agent_id == data.agent_id).first()
    await manager.broadcast_dashboard({
        "type": "inventory_updated",
        "agent_id": data.agent_id,
        "device_id": device.id if device else None,
        "hostname": device.hostname if device else data.hostname,
    })
    return {"status": "ok"}


@router.get("/commands")
def agent_get_commands(
    agent_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_agent_key),
):
    device = db.query(Device).filter(Device.agent_id == agent_id).first()
    if not device:
        return []

    commands = (db.query(PendingCommand)
                .filter(PendingCommand.device_id == device.id, PendingCommand.status == "pending")
                .order_by(PendingCommand.created_at).all())

    result = []
    for cmd in commands:
        result.append({
            "id": cmd.id,
            "command": cmd.command,
            "params": cmd.params or {},
        })
        cmd.status = "sent"

    db.commit()
    return result


@router.post("/command-result")
def agent_command_result(
    data: AgentCommandResultRequest,
    db: Session = Depends(get_db),
    _=Depends(verify_agent_key),
):
    cmd = db.query(PendingCommand).filter(PendingCommand.id == data.command_id).first()
    if cmd:
        cmd.status = "completed"
        cmd.result = data.result
        db.commit()
    return {"status": "received"}
