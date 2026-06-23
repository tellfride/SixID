import ctypes
import ctypes.wintypes
import logging
import subprocess
import os

logger = logging.getLogger("SysID9Agent")

_is_locked = False


def lock_screen(message: str = "Seu computador foi bloqueado pela equipe de TI."):
    global _is_locked

    if _is_locked:
        logger.info("Screen already locked")
        return

    success = False

    # Method 1: Direct LockWorkStation (works when running in user session)
    try:
        result = ctypes.windll.user32.LockWorkStation()
        if result:
            success = True
            logger.info("Screen locked via LockWorkStation")
    except Exception as e:
        logger.warning(f"LockWorkStation failed: {e}")

    # Method 2: rundll32 (works in most contexts)
    if not success:
        try:
            subprocess.run(
                ["rundll32.exe", "user32.dll,LockWorkStation"],
                timeout=5, capture_output=True,
            )
            success = True
            logger.info("Screen locked via rundll32")
        except Exception as e:
            logger.warning(f"rundll32 lock failed: {e}")

    # Method 3: Create a temp script that runs in the user's session via explorer trick
    if not success:
        try:
            script = os.path.join(os.environ.get("TEMP", "C:\\Windows\\Temp"), "sysid9_lock.vbs")
            with open(script, "w") as f:
                f.write('CreateObject("Wscript.Shell").Run "rundll32.exe user32.dll,LockWorkStation", 0, False\n')
            subprocess.Popen(
                ["wscript.exe", script],
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
            success = True
            logger.info("Screen locked via wscript")
        except Exception as e:
            logger.warning(f"wscript lock failed: {e}")

    # Method 4: tsdiscon (disconnect session — locks screen on local machine)
    if not success:
        try:
            subprocess.run(
                ["tsdiscon.exe"],
                timeout=5, capture_output=True,
            )
            success = True
            logger.info("Screen locked via tsdiscon")
        except Exception as e:
            logger.warning(f"tsdiscon failed: {e}")

    if success:
        _is_locked = True
    else:
        logger.error("All lock methods failed")


def unlock_screen():
    global _is_locked
    _is_locked = False
    logger.info("Screen unlock flag cleared")


def is_locked() -> bool:
    return _is_locked
