import json
import logging
import threading

import requests
import websocket

from sysid9_agent.config import agent_config

logger = logging.getLogger("SysID9Agent")


class APIClient:
    def __init__(self):
        url = agent_config.server_url.strip().rstrip("/")
        if not url.startswith("http://") and not url.startswith("https://"):
            url = "http://" + url
        self.base_url = url
        self.headers = {"X-Agent-Key": agent_config.agent_key}
        self._ws = None
        self._ws_thread = None

    def register(self, hostname: str) -> str | None:
        try:
            resp = requests.post(
                f"{self.base_url}/api/agent/register",
                json={"hostname": hostname, "agent_version": "1.0.0"},
                headers=self.headers,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("agent_id")
        except Exception as e:
            logger.error(f"Registration failed: {e}")
            return None

    def send_heartbeat(self, agent_id: str, current_user: str | None, hostname: str | None):
        try:
            resp = requests.post(
                f"{self.base_url}/api/agent/heartbeat",
                json={"agent_id": agent_id, "current_user": current_user, "hostname": hostname},
                headers=self.headers,
                timeout=15,
            )
            resp.raise_for_status()
            return True
        except Exception as e:
            logger.warning(f"Heartbeat failed: {e}")
            return False

    def send_inventory(self, inventory_data: dict):
        try:
            resp = requests.post(
                f"{self.base_url}/api/agent/inventory",
                json=inventory_data,
                headers=self.headers,
                timeout=60,
            )
            resp.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Inventory upload failed: {e}")
            return False

    def poll_commands(self, agent_id: str) -> list[dict]:
        try:
            resp = requests.get(
                f"{self.base_url}/api/agent/commands",
                params={"agent_id": agent_id},
                headers=self.headers,
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return []

    def report_command_result(self, agent_id: str, command_id: int, success: bool, result: str | None):
        try:
            requests.post(
                f"{self.base_url}/api/agent/command-result",
                json={"agent_id": agent_id, "command_id": command_id, "success": success, "result": result},
                headers=self.headers,
                timeout=10,
            )
        except Exception as e:
            logger.warning(f"Failed to report command result: {e}")

    def connect_websocket(self, agent_id: str, on_message_callback=None):
        ws_url = self.base_url.replace("http://", "ws://").replace("https://", "wss://")
        url = f"{ws_url}/ws/agent/{agent_id}"
        self._ws_callback = on_message_callback
        self._ws_agent_id = agent_id
        self._ws_url = url

        def _run():
            while True:
                try:
                    self._ws = websocket.WebSocketApp(
                        url,
                        on_message=lambda ws, msg: self._handle_ws_msg(msg),
                        on_error=lambda ws, err: logger.warning(f"WS error: {err}"),
                        on_close=lambda ws, code, msg: logger.info("WebSocket closed, reconnecting in 10s..."),
                        on_open=lambda ws: logger.info("WebSocket connected"),
                    )
                    self._ws.run_forever(ping_interval=30, ping_timeout=10)
                except Exception as e:
                    logger.warning(f"WS exception: {e}")
                import time
                time.sleep(10)

        self._ws_thread = threading.Thread(target=_run, daemon=True)
        self._ws_thread.start()

    def _handle_ws_msg(self, message):
        try:
            data = json.loads(message)
            if self._ws_callback:
                self._ws_callback(data)
        except Exception as e:
            logger.error(f"WS message error: {e}")

    def send_ws_heartbeat(self):
        if self._ws and self._ws.sock and self._ws.sock.connected:
            try:
                self._ws.send(json.dumps({"type": "heartbeat"}))
                return True
            except Exception:
                pass
        return False
