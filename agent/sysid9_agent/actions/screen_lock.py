import ctypes
import logging
import subprocess

logger = logging.getLogger("SysID9Agent")

_is_locked = False


def lock_screen(message: str = "Seu computador foi bloqueado pela equipe de TI."):
    global _is_locked

    if _is_locked:
        logger.info("Screen already locked")
        return

    try:
        ctypes.windll.user32.LockWorkStation()
        _is_locked = True
        logger.info("Screen locked via LockWorkStation")
    except Exception as e:
        logger.error(f"LockWorkStation failed: {e}")
        try:
            subprocess.run(
                ["rundll32.exe", "user32.dll,LockWorkStation"],
                timeout=5,
            )
            _is_locked = True
            logger.info("Screen locked via rundll32")
        except Exception as e2:
            logger.error(f"rundll32 lock failed: {e2}")


def unlock_screen():
    global _is_locked
    _is_locked = False
    logger.info("Screen unlock flag cleared (user must enter password)")


def is_locked() -> bool:
    return _is_locked
