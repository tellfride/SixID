import json
from datetime import datetime

from app.config import TIMEZONE_BR

from fastapi import WebSocket, WebSocketDisconnect

from app.database import SessionLocal
from app.models.device import Device, DeviceStatus


class ConnectionManager:
    def __init__(self):
        self.dashboard_connections: list[WebSocket] = []
        self.agent_connections: dict[str, WebSocket] = {}

    async def connect_dashboard(self, websocket: WebSocket):
        await websocket.accept()
        self.dashboard_connections.append(websocket)

    def disconnect_dashboard(self, websocket: WebSocket):
        if websocket in self.dashboard_connections:
            self.dashboard_connections.remove(websocket)

    async def connect_agent(self, agent_id: str, websocket: WebSocket):
        await websocket.accept()
        self.agent_connections[agent_id] = websocket
        await self._update_device_status(agent_id, DeviceStatus.ONLINE)
        await self.broadcast_status_change(agent_id, "online")

    async def disconnect_agent(self, agent_id: str):
        self.agent_connections.pop(agent_id, None)
        await self._update_device_status(agent_id, DeviceStatus.OFFLINE)
        await self.broadcast_status_change(agent_id, "offline")

    async def broadcast_status_change(self, agent_id: str, status: str):
        db = SessionLocal()
        try:
            device = db.query(Device).filter(Device.agent_id == agent_id).first()
            payload = {
                "type": "status_change",
                "agent_id": agent_id,
                "status": status,
                "timestamp": datetime.now(TIMEZONE_BR).isoformat(),
            }
            if device:
                payload["device_id"] = device.id
                payload["hostname"] = device.hostname
                payload["current_user"] = device.current_user
                payload["last_seen"] = device.last_seen.isoformat() if device.last_seen else None
        finally:
            db.close()

        message = json.dumps(payload)
        disconnected = []
        for ws in self.dashboard_connections:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect_dashboard(ws)

    async def send_to_agent(self, agent_id: str, data: dict) -> bool:
        ws = self.agent_connections.get(agent_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
                return True
            except Exception:
                await self.disconnect_agent(agent_id)
        return False

    async def broadcast_dashboard(self, data: dict):
        message = json.dumps(data)
        disconnected = []
        for ws in self.dashboard_connections:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect_dashboard(ws)

    async def _update_device_status(self, agent_id: str, status: DeviceStatus):
        db = SessionLocal()
        try:
            device = db.query(Device).filter(Device.agent_id == agent_id).first()
            if device:
                device.status = status
                device.last_seen = datetime.now(TIMEZONE_BR)
                db.commit()
        finally:
            db.close()


manager = ConnectionManager()
