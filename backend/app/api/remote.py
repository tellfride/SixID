import asyncio
from datetime import datetime

from app.config import TIMEZONE_BR

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.device import Device, DeviceStatus
from app.models.tracking import RemoteSession, ScreenLock, PendingCommand
from app.models.user import User, UserRole
from app.schemas.remote import LockScreenRequest, UnlockScreenRequest, SendCommandRequest, CreateUserRequest, ChangePasswordRequest, ChangeVncPasswordRequest
from app.services.audit_service import log_action
from app.utils.security import require_role, hash_password, verify_password
from app.websocket.manager import manager

router = APIRouter(prefix="/api/remote", tags=["Remote"])


def _get_device(db: Session, device_id: int) -> Device:
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    if device.status != DeviceStatus.ONLINE:
        raise HTTPException(status_code=400, detail="Dispositivo está offline")
    return device


def _get_device_ip(device: Device) -> str | None:
    if device.networks:
        for net in device.networks:
            if net.ip_address and not net.ip_address.startswith("127."):
                return net.ip_address
    return None


async def _send_command_to_agent(agent_id: str, command: str, params: dict | None = None) -> bool:
    return await manager.send_to_agent(agent_id, {
        "type": "command",
        "command": command,
        "params": params or {},
    })


@router.post("/{device_id}/vnc")
async def initiate_vnc(
    device_id: int, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TECHNICIAN)),
):
    device = _get_device(db, device_id)
    ip = _get_device_ip(device)

    if not ip:
        raise HTTPException(status_code=400, detail="IP do dispositivo não encontrado")

    sent = await _send_command_to_agent(device.agent_id, "start_vnc")

    pending = PendingCommand(device_id=device.id, command="start_vnc")
    db.add(pending)

    session = RemoteSession(
        device_id=device.id, user_id=current_user.id, session_type="vnc",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    log_action(db, "vnc_session_started", user_id=current_user.id, target_type="device",
               target_id=device_id, ip_address=request.client.host if request.client else None)

    return {
        "session_id": session.id,
        "device_ip": ip,
        "vnc_port": 5900,
        "command_sent": sent,
        "connection_string": f"{ip}:5900",
        "message": f"Conecte ao VNC em {ip}:5900" if sent else "Comando enviado, mas agente pode não ter recebido.",
    }


@router.get("/{device_id}/vnc-file")
async def download_vnc_file(
    device_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TECHNICIAN)),
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    ip = _get_device_ip(device)
    if not ip:
        raise HTTPException(status_code=400, detail="IP não encontrado")

    await _send_command_to_agent(device.agent_id, "start_vnc")

    vnc_content = f"[Connection]\nHost={ip}\nPort=5900\n[Options]\nFullScreen=0\nViewOnly=0\n"
    return Response(
        content=vnc_content,
        media_type="application/x-vnc",
        headers={"Content-Disposition": f'attachment; filename="{device.hostname}.vnc"'},
    )


@router.post("/{device_id}/lock")
async def lock_screen(
    device_id: int, data: LockScreenRequest, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TECHNICIAN)),
):
    device = _get_device(db, device_id)

    active_lock = db.query(ScreenLock).filter(
        ScreenLock.device_id == device.id, ScreenLock.is_active == True
    ).first()
    if active_lock:
        active_lock.is_active = False
        db.commit()

    sent = await _send_command_to_agent(device.agent_id, "lock_screen", {"message": data.message})

    pending = PendingCommand(device_id=device.id, command="lock_screen", params={"message": data.message})
    db.add(pending)

    lock = ScreenLock(
        device_id=device.id,
        locked_by=current_user.id,
        message=data.message,
        unlock_password_hash=hash_password(data.unlock_password) if data.unlock_password else None,
    )
    db.add(lock)

    session = RemoteSession(device_id=device.id, user_id=current_user.id, session_type="lock")
    db.add(session)
    db.commit()

    log_action(db, "screen_locked", user_id=current_user.id, target_type="device",
               target_id=device_id, details={"message": data.message},
               ip_address=request.client.host if request.client else None)

    return {"status": "locked", "command_sent": sent, "message": data.message}


@router.post("/{device_id}/unlock")
async def unlock_screen(
    device_id: int, data: UnlockScreenRequest, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TECHNICIAN)),
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

    lock = db.query(ScreenLock).filter(
        ScreenLock.device_id == device.id, ScreenLock.is_active == True
    ).first()
    if not lock:
        raise HTTPException(status_code=400, detail="Tela não está bloqueada")

    is_admin = current_user.role == UserRole.ADMIN
    password_ok = data.password and lock.unlock_password_hash and verify_password(data.password, lock.unlock_password_hash)

    if not is_admin and not password_ok:
        raise HTTPException(status_code=403, detail="Permissão insuficiente ou senha incorreta")

    sent = await _send_command_to_agent(device.agent_id, "unlock_screen")

    pending = PendingCommand(device_id=device.id, command="unlock_screen")
    db.add(pending)

    lock.is_active = False
    session = db.query(RemoteSession).filter(
        RemoteSession.device_id == device.id,
        RemoteSession.session_type == "lock",
        RemoteSession.ended_at == None,
    ).first()
    if session:
        session.ended_at = datetime.now(TIMEZONE_BR)
    db.commit()

    log_action(db, "screen_unlocked", user_id=current_user.id, target_type="device",
               target_id=device_id, ip_address=request.client.host if request.client else None)

    return {"status": "unlocked", "command_sent": sent}


@router.post("/{device_id}/command")
async def send_command(
    device_id: int, data: SendCommandRequest, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    device = _get_device(db, device_id)

    sent = await _send_command_to_agent(device.agent_id, data.command, data.params)

    pending = PendingCommand(device_id=device.id, command=data.command, params=data.params)
    db.add(pending)

    log_action(db, "command_sent", user_id=current_user.id, target_type="device",
               target_id=device_id, details={"command": data.command, "params": data.params},
               ip_address=request.client.host if request.client else None)

    return {
        "status": "sent" if sent else "queued",
        "command_sent": sent,
        "command": data.command,
        "device": device.hostname,
    }


@router.post("/batch/create-user")
async def batch_create_user(
    data: CreateUserRequest, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    results = []
    for device_id in data.device_ids:
        device = db.query(Device).filter(Device.id == device_id).first()
        if not device:
            results.append({"device_id": device_id, "hostname": "?", "status": "not_found"})
            continue

        params = {"username": data.username, "password": data.password, "is_admin": data.is_admin}
        sent = await _send_command_to_agent(device.agent_id, "create_user", params)

        pending = PendingCommand(device_id=device.id, command="create_user", params=params)
        db.add(pending)

        results.append({
            "device_id": device_id,
            "hostname": device.hostname,
            "status": "sent" if sent else "queued",
        })

    db.commit()

    log_action(db, "batch_create_user", user_id=current_user.id,
               details={"username": data.username, "is_admin": data.is_admin, "device_count": len(data.device_ids)},
               ip_address=request.client.host if request.client else None)

    return {"results": results}


@router.post("/batch/change-password")
async def batch_change_password(
    data: ChangePasswordRequest, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    results = []
    for device_id in data.device_ids:
        device = db.query(Device).filter(Device.id == device_id).first()
        if not device:
            results.append({"device_id": device_id, "hostname": "?", "status": "not_found"})
            continue

        params = {"username": data.username, "password": data.password}
        sent = await _send_command_to_agent(device.agent_id, "change_password", params)

        pending = PendingCommand(device_id=device.id, command="change_password", params=params)
        db.add(pending)

        results.append({
            "device_id": device_id,
            "hostname": device.hostname,
            "status": "sent" if sent else "queued",
        })

    db.commit()

    log_action(db, "batch_change_password", user_id=current_user.id,
               details={"username": data.username, "device_count": len(data.device_ids)},
               ip_address=request.client.host if request.client else None)

    return {"results": results}


@router.post("/batch/change-vnc-password")
async def batch_change_vnc_password(
    data: ChangeVncPasswordRequest, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    results = []
    for device_id in data.device_ids:
        device = db.query(Device).filter(Device.id == device_id).first()
        if not device:
            results.append({"device_id": device_id, "hostname": "?", "status": "not_found"})
            continue

        params = {"password": data.password}
        sent = await _send_command_to_agent(device.agent_id, "change_vnc_password", params)

        pending = PendingCommand(device_id=device.id, command="change_vnc_password", params=params)
        db.add(pending)

        results.append({
            "device_id": device_id,
            "hostname": device.hostname,
            "status": "sent" if sent else "queued",
        })

    db.commit()

    log_action(db, "batch_change_vnc_password", user_id=current_user.id,
               details={"device_count": len(data.device_ids)},
               ip_address=request.client.host if request.client else None)

    return {"results": results}
