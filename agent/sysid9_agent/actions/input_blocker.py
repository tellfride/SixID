import ctypes
import logging
import subprocess
import threading
import time

logger = logging.getLogger("SysID9Agent")

_block_thread = None
_block_active = False


def _get_active_session_id() -> int | None:
    try:
        result = subprocess.run(
            ["query", "user"],
            capture_output=True, text=True, timeout=10,
        )
        for line in result.stdout.splitlines()[1:]:
            if "Ativo" in line or "Active" in line:
                parts = line.split()
                for p in parts:
                    if p.isdigit():
                        return int(p)
    except Exception:
        pass
    return None


def _block_input_loop():
    """Continuously re-applies BlockInput in the user's session context."""
    global _block_active
    try:
        from ctypes import wintypes
        wtsapi32 = ctypes.windll.wtsapi32
        advapi32 = ctypes.windll.advapi32
        kernel32 = ctypes.windll.kernel32

        session_id = _get_active_session_id()
        if session_id is None:
            logger.warning("No active session found for BlockInput")
            _block_active = False
            return

        user_token = wintypes.HANDLE()
        if not wtsapi32.WTSQueryUserToken(wintypes.DWORD(session_id), ctypes.byref(user_token)):
            logger.warning(f"WTSQueryUserToken failed, error={kernel32.GetLastError()}")
            _block_active = False
            return

        dup_token = wintypes.HANDLE()
        if not advapi32.DuplicateTokenEx(
            user_token, 0x000F01FF, None, 2, 2, ctypes.byref(dup_token)
        ):
            kernel32.CloseHandle(user_token)
            logger.warning("DuplicateTokenEx failed for BlockInput")
            _block_active = False
            return
        kernel32.CloseHandle(user_token)

        if not advapi32.ImpersonateLoggedOnUser(dup_token):
            kernel32.CloseHandle(dup_token)
            logger.warning("ImpersonateLoggedOnUser failed")
            _block_active = False
            return

        logger.info(f"BlockInput active in session {session_id}")
        while _block_active:
            ctypes.windll.user32.BlockInput(True)
            time.sleep(0.5)

        ctypes.windll.user32.BlockInput(False)
        advapi32.RevertToSelf()
        kernel32.CloseHandle(dup_token)

    except Exception as e:
        logger.error(f"BlockInput loop error: {e}")
        try:
            ctypes.windll.user32.BlockInput(False)
            ctypes.windll.advapi32.RevertToSelf()
        except Exception:
            pass
    finally:
        _block_active = False
        logger.info("BlockInput loop stopped")


def block_input() -> bool:
    global _block_thread, _block_active

    if _block_active:
        return True

    _block_active = True
    _block_thread = threading.Thread(target=_block_input_loop, daemon=True)
    _block_thread.start()

    time.sleep(1)
    if not _block_active:
        return False

    logger.info("Keyboard and mouse blocked")
    return True


def unblock_input() -> bool:
    global _block_active, _block_thread

    _block_active = False

    try:
        ctypes.windll.user32.BlockInput(False)
    except Exception:
        pass

    if _block_thread and _block_thread.is_alive():
        _block_thread.join(timeout=3)
    _block_thread = None

    logger.info("Keyboard and mouse unblocked")
    return True


def is_input_blocked() -> bool:
    return _block_active
