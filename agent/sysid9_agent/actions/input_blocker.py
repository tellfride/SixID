import ctypes
import logging
import os
import subprocess
import time
import threading

logger = logging.getLogger("SysID9Agent")

_block_thread = None
_blocking = False


def block_input() -> bool:
    global _block_thread, _blocking

    if _blocking:
        logger.info("Input already blocked")
        return True

    # BlockInput requires the calling thread to be in the foreground session
    # and have SYSTEM/admin privileges. When running as SYSTEM via schtasks,
    # we call BlockInput directly — it works because SYSTEM has the privilege.
    try:
        result = ctypes.windll.user32.BlockInput(True)
        if result:
            _blocking = True

            # Keep re-applying every 500ms in a thread (BlockInput auto-releases on input)
            def _keep_blocked():
                while _blocking:
                    ctypes.windll.user32.BlockInput(True)
                    time.sleep(0.5)

            _block_thread = threading.Thread(target=_keep_blocked, daemon=True)
            _block_thread.start()
            logger.info("Keyboard and mouse blocked via BlockInput API")
            return True
        else:
            logger.warning(f"BlockInput(True) returned False, error={ctypes.windll.kernel32.GetLastError()}")
    except Exception as e:
        logger.warning(f"BlockInput direct failed: {e}")

    # Fallback: use PowerShell script in user session
    try:
        lock_dir = os.path.join(os.environ.get("PROGRAMDATA", "C:\\ProgramData"), "SysID9")
        os.makedirs(lock_dir, exist_ok=True)
        script_path = os.path.join(lock_dir, "sysid9_block_input.ps1")

        script = (
            'Add-Type -TypeDefinition @"\n'
            'using System;\n'
            'using System.Runtime.InteropServices;\n'
            'public class SysID9Block {\n'
            '    [DllImport("user32.dll")]\n'
            '    public static extern bool BlockInput(bool fBlockIt);\n'
            '}\n'
            '"@\n'
            'while ($true) {\n'
            '    [SysID9Block]::BlockInput($true)\n'
            '    Start-Sleep -Milliseconds 400\n'
            '}\n'
        )
        with open(script_path, "w") as f:
            f.write(script)

        subprocess.Popen(
            ["powershell.exe", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", script_path],
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        _blocking = True
        logger.info("Keyboard and mouse blocked via PowerShell fallback")
        return True
    except Exception as e:
        logger.error(f"All block_input methods failed: {e}")
        return False


def unblock_input() -> bool:
    global _blocking, _block_thread
    _blocking = False
    _block_thread = None

    # Release BlockInput
    try:
        ctypes.windll.user32.BlockInput(False)
    except Exception:
        pass

    # Kill PowerShell blockers
    try:
        subprocess.run(
            ["taskkill", "/F", "/FI", "WINDOWTITLE eq sysid9_block*"],
            capture_output=True, timeout=5,
        )
    except Exception:
        pass

    try:
        result = subprocess.run(
            ["wmic", "process", "where",
             "commandline like '%sysid9_block_input%'",
             "get", "processid"],
            capture_output=True, text=True, timeout=10,
        )
        for line in result.stdout.splitlines():
            pid = line.strip()
            if pid.isdigit():
                subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True, timeout=5)
    except Exception:
        pass

    # Clean up
    script_path = os.path.join(
        os.environ.get("PROGRAMDATA", "C:\\ProgramData"), "SysID9", "sysid9_block_input.ps1"
    )
    try:
        os.remove(script_path)
    except Exception:
        pass

    logger.info("Keyboard and mouse unblocked")
    return True


def is_input_blocked() -> bool:
    return _blocking
