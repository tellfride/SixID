import logging
import os
import subprocess
import urllib.request
import tempfile

logger = logging.getLogger("SysID9Agent")

VNC_SERVICE_NAME = "tvnserver"
VNC_DEFAULT_PATH = r"C:\Program Files\TightVNC\tvnserver.exe"
TIGHTVNC_MSI_URL = "https://www.tightvnc.com/download/2.8.85/tightvnc-2.8.85-gpl-setup-64bit.msi"
TIGHTVNC_MSI_ALT = "https://www.tightvnc.com/download/2.8.81/tightvnc-2.8.81-gpl-setup-64bit.msi"


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


def install_vnc_silent() -> bool:
    if is_vnc_installed():
        logger.info("TightVNC already installed")
        return True

    logger.info("Downloading TightVNC...")
    msi_path = os.path.join(tempfile.gettempdir(), "tightvnc_setup.msi")

    for url in [TIGHTVNC_MSI_URL, TIGHTVNC_MSI_ALT]:
        try:
            urllib.request.urlretrieve(url, msi_path)
            logger.info(f"Downloaded from {url}")
            break
        except Exception as e:
            logger.warning(f"Download failed from {url}: {e}")
    else:
        logger.error("Could not download TightVNC from any source")
        return False

    try:
        logger.info("Installing TightVNC silently...")
        import ctypes
        args = (
            f'/i "{msi_path}" /quiet /norestart '
            'ADDLOCAL=Server '
            'SET_USEVNCAUTHENTICATION=1 VALUE_OF_USEVNCAUTHENTICATION=1 '
            'SET_PASSWORD=1 VALUE_OF_PASSWORD=sysid9vnc '
            'SET_USECONTROLAUTHENTICATION=0 VALUE_OF_USECONTROLAUTHENTICATION=0'
        )
        ret = ctypes.windll.shell32.ShellExecuteW(
            None, "runas", "msiexec.exe", args, None, 0
        )
        import time
        for _ in range(30):
            time.sleep(2)
            if is_vnc_installed():
                logger.info("TightVNC installed successfully")
                try:
                    os.remove(msi_path)
                except Exception:
                    pass
                return True
        logger.error("TightVNC install timed out")
        return False
    except Exception as e:
        logger.error(f"TightVNC install error: {e}")
        return False


def start_vnc_service() -> bool:
    if not is_vnc_installed():
        if not install_vnc_silent():
            return False

    if is_vnc_running():
        logger.info("VNC service already running")
        return True

    try:
        subprocess.run(
            ["sc", "start", VNC_SERVICE_NAME],
            capture_output=True, text=True, timeout=30,
        )
        logger.info("VNC service started")
        return True
    except Exception as e:
        logger.error(f"Failed to start VNC: {e}")
        try:
            subprocess.Popen(
                [VNC_DEFAULT_PATH, "-run"],
                creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NO_WINDOW,
            )
            logger.info("VNC started as process")
            return True
        except Exception as e2:
            logger.error(f"Failed to start VNC as process: {e2}")
            return False


def stop_vnc_service() -> bool:
    try:
        subprocess.run(
            ["sc", "stop", VNC_SERVICE_NAME],
            capture_output=True, text=True, timeout=30,
        )
        logger.info("VNC service stopped")
        return True
    except Exception as e:
        logger.error(f"Failed to stop VNC: {e}")
        return False
