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
            parts = line.split()
            if len(parts) >= 3 and "Ativo" in line or "Active" in line:
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


def lock_screen(message: str = "Seu computador foi bloqueado pela equipe de TI."):
    global _is_locked, _lock_process

    if _is_locked:
        logger.info("Screen already locked")
        return

    hta_path = _create_hta_file(message)

    # Method 1: Launch in user session via schtasks (works from SYSTEM)
    session_id = _get_active_session_id()
    if session_id is not None:
        try:
            subprocess.run(
                ["schtasks", "/Delete", "/TN", "SysID9LockScreen", "/F"],
                capture_output=True, timeout=5,
            )
            result = subprocess.run(
                ["schtasks", "/Create",
                 "/TN", "SysID9LockScreen",
                 "/TR", f'mshta.exe "{hta_path}"',
                 "/SC", "ONCE",
                 "/ST", "00:00",
                 "/F"],
                capture_output=True, text=True, timeout=10,
            )
            if result.returncode == 0:
                run_result = subprocess.run(
                    ["schtasks", "/Run", "/TN", "SysID9LockScreen"],
                    capture_output=True, text=True, timeout=10,
                )
                if run_result.returncode == 0:
                    _is_locked = True
                    logger.info(f"Screen locked via schtasks (session {session_id})")
                    return
        except Exception as e:
            logger.warning(f"schtasks lock failed: {e}")

    # Method 2: Direct mshta launch
    try:
        _lock_process = subprocess.Popen(
            ["mshta.exe", hta_path],
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )
        _is_locked = True
        logger.info(f"Screen locked via mshta (PID {_lock_process.pid})")
        return
    except Exception as e:
        logger.warning(f"mshta direct failed: {e}")

    # Method 3: PowerShell launch in interactive session
    try:
        ps_cmd = f'Start-Process mshta.exe -ArgumentList \'"{hta_path}"\''
        _lock_process = subprocess.Popen(
            ["powershell.exe", "-WindowStyle", "Hidden", "-Command", ps_cmd],
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        _is_locked = True
        logger.info("Screen locked via powershell")
        return
    except Exception as e:
        logger.warning(f"PowerShell lock failed: {e}")

    logger.error("All lock methods failed")


def unlock_screen():
    global _is_locked, _lock_process

    if _lock_process:
        try:
            _lock_process.kill()
        except Exception:
            pass
        _lock_process = None

    # Kill mshta
    subprocess.run(["taskkill", "/F", "/IM", "mshta.exe"], capture_output=True, timeout=5)

    # Remove scheduled task
    subprocess.run(
        ["schtasks", "/Delete", "/TN", "SysID9LockScreen", "/F"],
        capture_output=True, timeout=5,
    )

    # Clean up HTA file
    hta_path = os.path.join(LOCK_DIR, "sysid9_lockscreen.hta")
    try:
        os.remove(hta_path)
    except Exception:
        pass

    _is_locked = False
    logger.info("Screen unlocked")


def is_locked() -> bool:
    return _is_locked
