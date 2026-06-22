import logging
import subprocess

from sixid_agent.actions.screen_lock import lock_screen, unlock_screen
from sixid_agent.actions.vnc_manager import start_vnc_service, stop_vnc_service

logger = logging.getLogger("SixiDAgent")


def execute_command(command: str, params: dict | None = None) -> dict:
    params = params or {}

    handlers = {
        "lock_screen": _handle_lock_screen,
        "unlock_screen": _handle_unlock_screen,
        "start_vnc": _handle_start_vnc,
        "stop_vnc": _handle_stop_vnc,
        "run_shell": _handle_run_shell,
        "restart": _handle_restart,
        "shutdown": _handle_shutdown,
    }

    handler = handlers.get(command)
    if not handler:
        return {"success": False, "result": f"Unknown command: {command}"}

    try:
        return handler(params)
    except Exception as e:
        logger.error(f"Command '{command}' failed: {e}")
        return {"success": False, "result": str(e)}


def _handle_lock_screen(params: dict) -> dict:
    message = params.get("message", "Seu computador foi bloqueado pela equipe de TI.")
    lock_screen(message)
    return {"success": True, "result": "Screen locked"}


def _handle_unlock_screen(params: dict) -> dict:
    unlock_screen()
    return {"success": True, "result": "Screen unlocked"}


def _handle_start_vnc(params: dict) -> dict:
    if start_vnc_service():
        return {"success": True, "result": "VNC service started"}
    return {"success": False, "result": "Failed to start VNC service"}


def _handle_stop_vnc(params: dict) -> dict:
    if stop_vnc_service():
        return {"success": True, "result": "VNC service stopped"}
    return {"success": False, "result": "Failed to stop VNC service"}


def _handle_run_shell(params: dict) -> dict:
    cmd = params.get("cmd")
    if not cmd:
        return {"success": False, "result": "No command specified"}
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
    return {
        "success": result.returncode == 0,
        "result": result.stdout[:4096] if result.stdout else result.stderr[:4096],
    }


def _handle_restart(params: dict) -> dict:
    subprocess.Popen(["shutdown", "/r", "/t", "5", "/c", "SixiD: Reiniciando..."])
    return {"success": True, "result": "Restarting in 5 seconds"}


def _handle_shutdown(params: dict) -> dict:
    subprocess.Popen(["shutdown", "/s", "/t", "5", "/c", "SixiD: Desligando..."])
    return {"success": True, "result": "Shutting down in 5 seconds"}
