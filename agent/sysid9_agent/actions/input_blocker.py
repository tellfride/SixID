import ctypes
import logging
import os
import subprocess
import time

logger = logging.getLogger("SysID9Agent")

_blocker_process = None
LOCK_DIR = os.path.join(os.environ.get("PROGRAMDATA", "C:\\ProgramData"), "SysID9")


def _create_blocker_script() -> str:
    """Create a PowerShell script that blocks input in the user's session."""
    script_path = os.path.join(LOCK_DIR, "sysid9_block_input.ps1")
    os.makedirs(LOCK_DIR, exist_ok=True)

    script = '''
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class SysID9InputBlocker {
    [DllImport("user32.dll")]
    public static extern bool BlockInput(bool fBlockIt);
}
"@
while ($true) {
    [SysID9InputBlocker]::BlockInput($true)
    Start-Sleep -Milliseconds 400
}
'''
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(script)
    return script_path


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


def _launch_in_user_session(command: str, session_id: int) -> bool:
    """Launch a process in the user's interactive session using Win32 APIs."""
    try:
        from ctypes import wintypes

        wtsapi32 = ctypes.windll.wtsapi32
        advapi32 = ctypes.windll.advapi32
        kernel32 = ctypes.windll.kernel32
        userenv = ctypes.windll.userenv

        user_token = wintypes.HANDLE()
        if not wtsapi32.WTSQueryUserToken(wintypes.DWORD(session_id), ctypes.byref(user_token)):
            logger.warning(f"WTSQueryUserToken failed, error={kernel32.GetLastError()}")
            return False

        dup_token = wintypes.HANDLE()
        if not advapi32.DuplicateTokenEx(
            user_token, 0x000F01FF, None, 2, 1, ctypes.byref(dup_token)
        ):
            kernel32.CloseHandle(user_token)
            return False
        kernel32.CloseHandle(user_token)

        env_block = ctypes.c_void_p()
        userenv.CreateEnvironmentBlock(ctypes.byref(env_block), dup_token, False)

        class STARTUPINFOW(ctypes.Structure):
            _fields_ = [
                ("cb", wintypes.DWORD), ("lpReserved", wintypes.LPWSTR),
                ("lpDesktop", wintypes.LPWSTR), ("lpTitle", wintypes.LPWSTR),
                ("dwX", wintypes.DWORD), ("dwY", wintypes.DWORD),
                ("dwXSize", wintypes.DWORD), ("dwYSize", wintypes.DWORD),
                ("dwXCountChars", wintypes.DWORD), ("dwYCountChars", wintypes.DWORD),
                ("dwFillAttribute", wintypes.DWORD), ("dwFlags", wintypes.DWORD),
                ("wShowWindow", wintypes.WORD), ("cbReserved2", wintypes.WORD),
                ("lpReserved2", ctypes.c_void_p),
                ("hStdInput", wintypes.HANDLE), ("hStdOutput", wintypes.HANDLE),
                ("hStdError", wintypes.HANDLE),
            ]

        class PROCESS_INFORMATION(ctypes.Structure):
            _fields_ = [
                ("hProcess", wintypes.HANDLE), ("hThread", wintypes.HANDLE),
                ("dwProcessId", wintypes.DWORD), ("dwThreadId", wintypes.DWORD),
            ]

        si = STARTUPINFOW()
        si.cb = ctypes.sizeof(STARTUPINFOW)
        si.lpDesktop = "winsta0\\default"
        si.dwFlags = 0x00000001  # STARTF_USESHOWWINDOW
        si.wShowWindow = 0  # SW_HIDE
        pi = PROCESS_INFORMATION()

        CREATE_NO_WINDOW = 0x08000000
        CREATE_UNICODE_ENVIRONMENT = 0x00000400

        success = advapi32.CreateProcessAsUserW(
            dup_token, None, command, None, None, False,
            CREATE_NO_WINDOW | CREATE_UNICODE_ENVIRONMENT,
            env_block, None, ctypes.byref(si), ctypes.byref(pi),
        )

        if env_block:
            userenv.DestroyEnvironmentBlock(env_block)
        kernel32.CloseHandle(dup_token)

        if success:
            kernel32.CloseHandle(pi.hProcess)
            kernel32.CloseHandle(pi.hThread)
            logger.info(f"BlockInput process launched in session {session_id} (PID {pi.dwProcessId})")
            return True

        logger.warning(f"CreateProcessAsUserW failed, error={kernel32.GetLastError()}")
        return False

    except Exception as e:
        logger.warning(f"_launch_in_user_session failed: {e}")
        return False


def _is_blocker_running() -> bool:
    try:
        result = subprocess.run(
            ["powershell", "-Command",
             "Get-Process powershell -ErrorAction SilentlyContinue | "
             "Where-Object { $_.CommandLine -match 'sysid9_block_input' } | "
             "Select-Object -First 1 -ExpandProperty Id"],
            capture_output=True, text=True, timeout=10,
        )
        return bool(result.stdout.strip())
    except Exception:
        return False


def block_input() -> bool:
    if _is_blocker_running():
        logger.info("Input already blocked")
        return True

    script_path = _create_blocker_script()
    command = f'powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "{script_path}"'

    session_id = _get_active_session_id()
    if session_id is not None:
        if _launch_in_user_session(command, session_id):
            time.sleep(1)
            if _is_blocker_running():
                logger.info("Keyboard and mouse blocked via CreateProcessAsUser")
                return True
            logger.warning("BlockInput process launched but not found running")

    # Fallback: schtasks
    try:
        subprocess.run(["schtasks", "/Delete", "/TN", "SysID9BlockInput", "/F"],
                       capture_output=True, timeout=5)
        result = subprocess.run(
            ["schtasks", "/Create",
             "/TN", "SysID9BlockInput",
             "/TR", f'powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "{script_path}"',
             "/SC", "ONCE", "/ST", "00:00", "/F"],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            subprocess.run(["schtasks", "/Run", "/TN", "SysID9BlockInput"],
                           capture_output=True, timeout=10)
            time.sleep(1)
            if _is_blocker_running():
                logger.info("Keyboard and mouse blocked via schtasks")
                return True
    except Exception as e:
        logger.warning(f"schtasks fallback failed: {e}")

    logger.error("All BlockInput methods failed")
    return False


def unblock_input() -> bool:
    # Kill all PowerShell processes running our script
    try:
        subprocess.run(
            ["powershell", "-Command",
             "Get-Process powershell -ErrorAction SilentlyContinue | "
             "Where-Object { $_.CommandLine -match 'sysid9_block_input' } | "
             "Stop-Process -Force"],
            capture_output=True, timeout=10,
        )
    except Exception:
        pass

    # Also call BlockInput(False) to ensure it's released
    try:
        subprocess.run(
            ["powershell", "-Command",
             'Add-Type -TypeDefinition @"\n'
             "using System.Runtime.InteropServices;\n"
             "public class SysID9Unblock {\n"
             '    [DllImport(\\"user32.dll\\")]\n'
             "    public static extern bool BlockInput(bool b);\n"
             '}\n"@\n'
             "[SysID9Unblock]::BlockInput($false)"],
            capture_output=True, timeout=10,
        )
    except Exception:
        pass

    # Remove scheduled task
    try:
        subprocess.run(["schtasks", "/Delete", "/TN", "SysID9BlockInput", "/F"],
                       capture_output=True, timeout=5)
    except Exception:
        pass

    # Clean up script file
    script_path = os.path.join(LOCK_DIR, "sysid9_block_input.ps1")
    try:
        os.remove(script_path)
    except Exception:
        pass

    logger.info("Keyboard and mouse unblocked")
    return True


def is_input_blocked() -> bool:
    return _is_blocker_running()
