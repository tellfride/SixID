import ctypes
import logging
import os
import subprocess
import time

logger = logging.getLogger("SysID9Agent")

_blocking = False
LOCK_DIR = os.path.join(os.environ.get("PROGRAMDATA", "C:\\ProgramData"), "SysID9")
SCRIPT_PATH = os.path.join(LOCK_DIR, "sysid9_block_input.ps1")


def _get_active_session_id() -> int | None:
    try:
        result = subprocess.run(
            ["query", "user"], capture_output=True, text=True, timeout=10,
        )
        for line in result.stdout.splitlines()[1:]:
            if "Ativo" in line or "Active" in line:
                for p in line.split():
                    if p.isdigit():
                        return int(p)
    except Exception:
        pass
    return None


def _launch_in_user_session(command: str, session_id: int) -> bool:
    try:
        from ctypes import wintypes
        wtsapi32 = ctypes.windll.wtsapi32
        advapi32 = ctypes.windll.advapi32
        kernel32 = ctypes.windll.kernel32
        userenv = ctypes.windll.userenv

        user_token = wintypes.HANDLE()
        if not wtsapi32.WTSQueryUserToken(wintypes.DWORD(session_id), ctypes.byref(user_token)):
            return False

        dup_token = wintypes.HANDLE()
        if not advapi32.DuplicateTokenEx(user_token, 0x000F01FF, None, 2, 1, ctypes.byref(dup_token)):
            kernel32.CloseHandle(user_token)
            return False
        kernel32.CloseHandle(user_token)

        env_block = ctypes.c_void_p()
        userenv.CreateEnvironmentBlock(ctypes.byref(env_block), dup_token, False)

        class SI(ctypes.Structure):
            _fields_ = [
                ("cb", wintypes.DWORD), ("r1", wintypes.LPWSTR),
                ("lpDesktop", wintypes.LPWSTR), ("r3", wintypes.LPWSTR),
                ("r4", wintypes.DWORD), ("r5", wintypes.DWORD),
                ("r6", wintypes.DWORD), ("r7", wintypes.DWORD),
                ("r8", wintypes.DWORD), ("r9", wintypes.DWORD),
                ("r10", wintypes.DWORD), ("dwFlags", wintypes.DWORD),
                ("wShowWindow", wintypes.WORD), ("r12", wintypes.WORD),
                ("r13", ctypes.c_void_p),
                ("r14", wintypes.HANDLE), ("r15", wintypes.HANDLE),
                ("r16", wintypes.HANDLE),
            ]

        class PI(ctypes.Structure):
            _fields_ = [
                ("hProcess", wintypes.HANDLE), ("hThread", wintypes.HANDLE),
                ("dwProcessId", wintypes.DWORD), ("dwThreadId", wintypes.DWORD),
            ]

        si = SI()
        si.cb = ctypes.sizeof(SI)
        si.lpDesktop = "winsta0\\default"
        si.dwFlags = 0x00000001
        si.wShowWindow = 0
        pi = PI()

        ok = advapi32.CreateProcessAsUserW(
            dup_token, None, command, None, None, False,
            0x08000000 | 0x00000400,
            env_block, None, ctypes.byref(si), ctypes.byref(pi),
        )

        if env_block:
            userenv.DestroyEnvironmentBlock(env_block)
        kernel32.CloseHandle(dup_token)

        if ok:
            kernel32.CloseHandle(pi.hProcess)
            kernel32.CloseHandle(pi.hThread)
            logger.info(f"BlockInput launched in user session {session_id} (PID {pi.dwProcessId})")
            return True
        return False
    except Exception as e:
        logger.warning(f"CreateProcessAsUser failed: {e}")
        return False


def _create_block_script():
    os.makedirs(LOCK_DIR, exist_ok=True)
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
    with open(SCRIPT_PATH, "w") as f:
        f.write(script)


def block_input() -> bool:
    global _blocking

    if _blocking:
        logger.info("Input already blocked")
        return True

    _create_block_script()
    command = f'powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "{SCRIPT_PATH}"'

    session_id = _get_active_session_id()

    # Method 1: Launch in user session via CreateProcessAsUser
    if session_id is not None:
        if _launch_in_user_session(command, session_id):
            _blocking = True
            time.sleep(1)
            logger.info("Keyboard and mouse blocked (user session)")
            return True

    # Method 2: schtasks /Run (runs as interactive user)
    try:
        subprocess.run(["schtasks", "/Delete", "/TN", "SysID9BlockInput", "/F"],
                       capture_output=True, timeout=5)
        subprocess.run(
            ["schtasks", "/Create",
             "/TN", "SysID9BlockInput",
             "/TR", command,
             "/SC", "ONCE", "/ST", "00:00", "/F"],
            capture_output=True, timeout=10,
        )
        subprocess.run(["schtasks", "/Run", "/TN", "SysID9BlockInput"],
                       capture_output=True, timeout=10)
        _blocking = True
        time.sleep(1)
        logger.info("Keyboard and mouse blocked (schtasks)")
        return True
    except Exception as e:
        logger.warning(f"schtasks block failed: {e}")

    logger.error("All BlockInput methods failed")
    return False


def unblock_input() -> bool:
    global _blocking
    _blocking = False

    # Kill all PowerShell running our script
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

    # Also release via API call in case any process still holds it
    try:
        ctypes.windll.user32.BlockInput(False)
    except Exception:
        pass

    # Clean up
    subprocess.run(["schtasks", "/Delete", "/TN", "SysID9BlockInput", "/F"],
                   capture_output=True, timeout=5)
    try:
        os.remove(SCRIPT_PATH)
    except Exception:
        pass

    logger.info("Keyboard and mouse unblocked")
    return True


def is_input_blocked() -> bool:
    return _blocking
