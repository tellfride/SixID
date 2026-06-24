import ctypes
import logging
import os
import subprocess

logger = logging.getLogger("SysID9Agent")

_is_locked = False
_lock_process = None
LOCK_DIR = os.path.join(os.environ.get("PROGRAMDATA", "C:\\ProgramData"), "SysID9")


def _create_hta_file(message: str) -> str:
    hta_path = os.path.join(LOCK_DIR, "sysid9_lockscreen.hta")
    os.makedirs(LOCK_DIR, exist_ok=True)

    hta_content = f'''<html>
<head><title>SysID9Lock</title>
<HTA:APPLICATION ID="lock" BORDER="none" BORDERSTYLE="none" CAPTION="no"
  INNERBORDER="no" MAXIMIZEBUTTON="no" MINIMIZEBUTTON="no" SCROLL="no"
  SHOWINTASKBAR="no" SINGLEINSTANCE="yes" SYSMENU="no" WINDOWSTATE="maximize" />
<style>
  * {{ margin:0; padding:0; }}
  body {{ background:#0B1220; display:flex; align-items:center;
         justify-content:center; height:100vh; font-family:'Segoe UI',sans-serif;
         overflow:hidden; }}
  .box {{ text-align:center; color:#E6EBF1; }}
  .icon {{ font-size:80px; margin-bottom:20px; }}
  .title {{ font-size:36px; font-weight:bold; color:#FF4D4F; margin-bottom:24px; }}
  .msg {{ font-size:18px; max-width:700px; margin:0 auto 40px; line-height:1.6; }}
  .footer {{ font-size:11px; color:#5B6470; }}
</style>
<script language="VBScript">
  Sub Window_OnLoad
    window.resizeTo screen.width, screen.height
    window.moveTo 0, 0
    self.focus
  End Sub
</script>
<script language="JavaScript">
  setInterval(function(){{
    try {{ window.focus(); self.focus(); }} catch(e){{}}
  }}, 300);
  document.onkeydown = function(e){{
    e = e || window.event;
    if(e.altKey || e.ctrlKey || e.keyCode==91 || e.keyCode==27) return false;
  }};
  document.oncontextmenu = function(){{ return false; }};
</script>
</head>
<body>
<div class="box">
  <div class="icon">&#128274;</div>
  <div class="title">TELA BLOQUEADA</div>
  <div class="msg">{message}</div>
  <div class="footer">SixiD - Sistema de Gestão de Ativos e Inventário de TI</div>
</div>
</body></html>'''

    with open(hta_path, "w", encoding="utf-8") as f:
        f.write(hta_content)
    return hta_path


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
        for line in result.stdout.splitlines()[1:]:
            parts = line.split()
            for p in parts:
                if p.isdigit():
                    return int(p)
    except Exception:
        pass
    return None


def _get_active_username() -> str | None:
    try:
        result = subprocess.run(
            ["query", "user"],
            capture_output=True, text=True, timeout=10,
        )
        for line in result.stdout.splitlines()[1:]:
            if "Ativo" in line or "Active" in line:
                parts = line.split()
                if parts:
                    return parts[0].lstrip(">")
    except Exception:
        pass
    return None


def _launch_in_user_session(command: str, session_id: int) -> bool:
    """Launch a process in the user's interactive session using Win32 APIs.
    Required when the agent runs as SYSTEM (Session 0) and needs to show UI."""
    try:
        from ctypes import wintypes

        wtsapi32 = ctypes.windll.wtsapi32
        advapi32 = ctypes.windll.advapi32
        kernel32 = ctypes.windll.kernel32
        userenv = ctypes.windll.userenv

        user_token = wintypes.HANDLE()
        if not wtsapi32.WTSQueryUserToken(wintypes.DWORD(session_id), ctypes.byref(user_token)):
            logger.warning(f"WTSQueryUserToken failed for session {session_id}, error={kernel32.GetLastError()}")
            return False

        dup_token = wintypes.HANDLE()
        TOKEN_ALL_ACCESS = 0x000F01FF
        if not advapi32.DuplicateTokenEx(
            user_token, TOKEN_ALL_ACCESS, None, 2, 1, ctypes.byref(dup_token)
        ):
            logger.warning(f"DuplicateTokenEx failed, error={kernel32.GetLastError()}")
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
        pi = PROCESS_INFORMATION()

        CREATE_NEW_CONSOLE = 0x00000010
        CREATE_UNICODE_ENVIRONMENT = 0x00000400

        success = advapi32.CreateProcessAsUserW(
            dup_token, None, command, None, None, False,
            CREATE_NEW_CONSOLE | CREATE_UNICODE_ENVIRONMENT,
            env_block, None, ctypes.byref(si), ctypes.byref(pi),
        )

        if env_block:
            userenv.DestroyEnvironmentBlock(env_block)
        kernel32.CloseHandle(dup_token)

        if success:
            kernel32.CloseHandle(pi.hProcess)
            kernel32.CloseHandle(pi.hThread)
            logger.info(f"Process launched in user session {session_id} (PID {pi.dwProcessId})")
            return True

        logger.warning(f"CreateProcessAsUserW failed, error={kernel32.GetLastError()}")
        return False

    except Exception as e:
        logger.warning(f"_launch_in_user_session failed: {e}")
        return False


def _verify_mshta_running() -> bool:
    try:
        result = subprocess.run(
            ["tasklist", "/FI", "IMAGENAME eq mshta.exe"],
            capture_output=True, text=True, timeout=5,
        )
        return "mshta.exe" in result.stdout
    except Exception:
        return False


def lock_screen(message: str = "Seu computador foi bloqueado pela equipe de TI.") -> bool:
    global _is_locked, _lock_process

    if _is_locked and _verify_mshta_running():
        logger.info("Screen already locked")
        return True

    hta_path = _create_hta_file(message)
    command = f'mshta.exe "{hta_path}"'

    session_id = _get_active_session_id()

    # Method 1: CreateProcessAsUser — launches in user session from SYSTEM
    if session_id is not None:
        if _launch_in_user_session(command, session_id):
            import time
            time.sleep(1)
            if _verify_mshta_running():
                _is_locked = True
                logger.info(f"Screen locked via CreateProcessAsUser (session {session_id})")
                return True
            logger.warning("CreateProcessAsUser succeeded but mshta not running")

    # Method 2: schtasks targeting the logged-in user
    username = _get_active_username()
    if username:
        try:
            subprocess.run(
                ["schtasks", "/Delete", "/TN", "SysID9LockScreen", "/F"],
                capture_output=True, timeout=5,
            )
            result = subprocess.run(
                ["schtasks", "/Create",
                 "/TN", "SysID9LockScreen",
                 "/TR", f'mshta.exe "{hta_path}"',
                 "/SC", "ONCE", "/ST", "00:00",
                 "/RU", username, "/IT", "/F"],
                capture_output=True, text=True, timeout=10,
            )
            if result.returncode == 0:
                run_result = subprocess.run(
                    ["schtasks", "/Run", "/TN", "SysID9LockScreen"],
                    capture_output=True, text=True, timeout=10,
                )
                if run_result.returncode == 0:
                    import time
                    time.sleep(1)
                    if _verify_mshta_running():
                        _is_locked = True
                        logger.info(f"Screen locked via schtasks (user: {username})")
                        return True
                    logger.warning("schtasks ran but mshta not found")
        except Exception as e:
            logger.warning(f"schtasks lock failed: {e}")

    # Method 3: Direct mshta (works when agent runs as interactive user, not SYSTEM)
    try:
        _lock_process = subprocess.Popen(
            ["mshta.exe", hta_path],
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )
        import time
        time.sleep(1)
        if _lock_process.poll() is None:
            _is_locked = True
            logger.info(f"Screen locked via mshta direct (PID {_lock_process.pid})")
            return True
        logger.warning("mshta direct process exited immediately")
    except Exception as e:
        logger.warning(f"mshta direct failed: {e}")

    logger.error("All lock methods failed")
    return False


def unlock_screen():
    global _is_locked, _lock_process

    if _lock_process:
        try:
            _lock_process.kill()
        except Exception:
            pass
        _lock_process = None

    subprocess.run(["taskkill", "/F", "/IM", "mshta.exe"], capture_output=True, timeout=5)

    subprocess.run(
        ["schtasks", "/Delete", "/TN", "SysID9LockScreen", "/F"],
        capture_output=True, timeout=5,
    )

    hta_path = os.path.join(LOCK_DIR, "sysid9_lockscreen.hta")
    try:
        os.remove(hta_path)
    except Exception:
        pass

    _is_locked = False
    logger.info("Screen unlocked")


def is_locked() -> bool:
    return _is_locked
