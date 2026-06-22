import logging
import os
import subprocess

logger = logging.getLogger("SixiDAgent")

VNC_SERVICE_NAME = "tvnserver"
VNC_DEFAULT_PATH = r"C:\Program Files\TightVNC\tvnserver.exe"


def is_vnc_installed() -> bool:
    return os.path.exists(VNC_DEFAULT_PATH)


def is_vnc_running() -> bool:
    try:
        result = subprocess.run(
            ["sc", "query", VNC_SERVICE_NAME],
            capture_output=True, text=True, timeout=10,
        )
        return "RUNNING" in result.stdout
    except Exception:
        return False


def start_vnc_service():
    if not is_vnc_installed():
        logger.error("TightVNC is not installed")
        return False

    try:
        subprocess.run(
            ["sc", "start", VNC_SERVICE_NAME],
            capture_output=True, text=True, timeout=30,
        )
        logger.info("VNC service started")
        return True
    except Exception as e:
        logger.error(f"Failed to start VNC service: {e}")
        return False


def stop_vnc_service():
    try:
        subprocess.run(
            ["sc", "stop", VNC_SERVICE_NAME],
            capture_output=True, text=True, timeout=30,
        )
        logger.info("VNC service stopped")
        return True
    except Exception as e:
        logger.error(f"Failed to stop VNC service: {e}")
        return False


def configure_vnc(password: str = "sixidvnc"):
    if not is_vnc_installed():
        return False
    try:
        subprocess.run(
            [VNC_DEFAULT_PATH, "-controlservice", "-setparam", f"Password={password}"],
            capture_output=True, text=True, timeout=15,
        )
        return True
    except Exception as e:
        logger.error(f"VNC configuration failed: {e}")
        return False
