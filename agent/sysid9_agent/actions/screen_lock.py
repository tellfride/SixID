import ctypes
import logging
import os
import subprocess
import tempfile

logger = logging.getLogger("SysID9Agent")

_is_locked = False
_lock_process = None

LOCK_SCRIPT_TEMPLATE = r'''
import tkinter as tk
import ctypes
import sys
import os

MESSAGE = """{message}"""

def create_lock():
    root = tk.Tk()
    root.attributes("-fullscreen", True)
    root.attributes("-topmost", True)
    root.configure(bg="#0B1220")
    root.overrideredirect(True)
    root.focus_force()

    # Block Alt+F4
    root.protocol("WM_DELETE_WINDOW", lambda: None)
    root.bind("<Alt-F4>", lambda e: "break")
    root.bind("<Alt_L>", lambda e: "break")
    root.bind("<Control-Alt-Delete>", lambda e: "break")

    # Keep on top
    def stay_on_top():
        try:
            root.attributes("-topmost", True)
            root.lift()
            root.focus_force()
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            my_hwnd = root.winfo_id()
            if hwnd != my_hwnd:
                ctypes.windll.user32.SetForegroundWindow(my_hwnd)
        except:
            pass
        root.after(500, stay_on_top)

    frame = tk.Frame(root, bg="#0B1220")
    frame.place(relx=0.5, rely=0.5, anchor="center")

    # Lock icon
    tk.Label(frame, text="\U0001F512", font=("Segoe UI Emoji", 64),
             bg="#0B1220", fg="#FF4D4F").pack(pady=(0, 20))

    # Title
    tk.Label(frame, text="TELA BLOQUEADA", font=("Segoe UI", 32, "bold"),
             bg="#0B1220", fg="#FF4D4F").pack(pady=(0, 24))

    # Message
    tk.Label(frame, text=MESSAGE, font=("Segoe UI", 16),
             bg="#0B1220", fg="#E6EBF1", wraplength=700,
             justify="center").pack(pady=(0, 32))

    # Footer
    tk.Label(frame, text="SixiD - Sistema de Gestão de Ativos",
             font=("Segoe UI", 10), bg="#0B1220", fg="#5B6470").pack()

    stay_on_top()
    root.mainloop()

if __name__ == "__main__":
    create_lock()
'''

UNLOCK_SCRIPT = r'''
import subprocess
import os
subprocess.run(["taskkill", "/F", "/FI", "WINDOWTITLE eq SysID9Lock*"], capture_output=True)
subprocess.run(["taskkill", "/F", "/FI", "IMAGENAME eq pythonw.exe"], capture_output=True)
# Kill all python processes running the lock script
for proc in os.popen('wmic process where "commandline like \'%%sysid9_lockscreen%%\'" get processid').read().split():
    if proc.strip().isdigit():
        subprocess.run(["taskkill", "/F", "/PID", proc.strip()], capture_output=True)
'''


def _get_lock_script_path():
    return os.path.join(
        os.environ.get("PROGRAMDATA", "C:\\ProgramData"),
        "SysID9", "sysid9_lockscreen.pyw"
    )


def _find_python():
    """Find python or pythonw executable."""
    for path in [
        os.path.join(os.path.dirname(os.sys.executable), "pythonw.exe"),
        os.path.join(os.path.dirname(os.sys.executable), "python.exe"),
        r"C:\Windows\py.exe",
    ]:
        if os.path.exists(path):
            return path

    import shutil
    for name in ["pythonw", "python", "py"]:
        found = shutil.which(name)
        if found:
            return found
    return None


def lock_screen(message: str = "Seu computador foi bloqueado pela equipe de TI."):
    global _is_locked, _lock_process

    if _is_locked:
        logger.info("Screen already locked")
        return

    # Write the lock screen script
    script_path = _get_lock_script_path()
    script_content = LOCK_SCRIPT_TEMPLATE.replace("{message}", message.replace('"', '\\"'))

    os.makedirs(os.path.dirname(script_path), exist_ok=True)
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(script_content)

    # Method 1: Try launching with pythonw (no console window)
    python = _find_python()
    if python:
        try:
            _lock_process = subprocess.Popen(
                [python, script_path],
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
            _is_locked = True
            logger.info(f"Screen locked via {python} (PID {_lock_process.pid})")
            return
        except Exception as e:
            logger.warning(f"Python launch failed: {e}")

    # Method 2: Try with mshta (HTML Application — no Python needed)
    try:
        hta_path = os.path.join(
            os.environ.get("PROGRAMDATA", "C:\\ProgramData"),
            "SysID9", "sysid9_lockscreen.hta"
        )
        hta_content = f'''<html>
<head><title>SysID9Lock</title>
<HTA:APPLICATION ID="lock" BORDER="none" BORDERSTYLE="none" CAPTION="no"
  INNERBORDER="no" MAXIMIZEBUTTON="no" MINIMIZEBUTTON="no" SCROLL="no"
  SHOWINTASKBAR="no" SINGLEINSTANCE="yes" SYSMENU="no" WINDOWSTATE="maximize" />
<style>
  body {{ margin:0; background:#0B1220; display:flex; align-items:center;
         justify-content:center; height:100vh; font-family:'Segoe UI',sans-serif; }}
  .box {{ text-align:center; color:#E6EBF1; }}
  .icon {{ font-size:64px; color:#FF4D4F; }}
  .title {{ font-size:32px; font-weight:bold; color:#FF4D4F; margin:20px 0; }}
  .msg {{ font-size:16px; max-width:700px; margin:0 auto 32px; }}
  .footer {{ font-size:10px; color:#5B6470; }}
</style>
<script>
  window.resizeTo(screen.width, screen.height);
  window.moveTo(0, 0);
  setInterval(function(){{ window.focus(); }}, 500);
  document.onkeydown = function(e){{ if(e.altKey||e.ctrlKey) return false; }};
</script>
</head>
<body>
<div class="box">
  <div class="icon">&#128274;</div>
  <div class="title">TELA BLOQUEADA</div>
  <div class="msg">{message}</div>
  <div class="footer">SixiD - Sistema de Gestão de Ativos</div>
</div>
</body></html>'''

        with open(hta_path, "w", encoding="utf-8") as f:
            f.write(hta_content)

        _lock_process = subprocess.Popen(
            ["mshta.exe", hta_path],
        )
        _is_locked = True
        logger.info(f"Screen locked via mshta (PID {_lock_process.pid})")
        return
    except Exception as e:
        logger.warning(f"mshta lock failed: {e}")

    logger.error("All lock methods failed")


def unlock_screen():
    global _is_locked, _lock_process

    # Kill lock process
    if _lock_process:
        try:
            _lock_process.kill()
            logger.info(f"Lock process killed (PID {_lock_process.pid})")
        except Exception:
            pass
        _lock_process = None

    # Kill by script name
    try:
        subprocess.run(
            ["taskkill", "/F", "/FI", "WINDOWTITLE eq SysID9Lock"],
            capture_output=True, timeout=5,
        )
    except Exception:
        pass

    # Kill mshta instances
    try:
        subprocess.run(
            ["taskkill", "/F", "/IM", "mshta.exe"],
            capture_output=True, timeout=5,
        )
    except Exception:
        pass

    # Kill python running the lock script
    script_path = _get_lock_script_path()
    try:
        result = subprocess.run(
            ["wmic", "process", "where",
             f"commandline like '%sysid9_lockscreen%'",
             "get", "processid"],
            capture_output=True, text=True, timeout=10,
        )
        for line in result.stdout.splitlines():
            pid = line.strip()
            if pid.isdigit():
                subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True, timeout=5)
    except Exception:
        pass

    # Clean up files
    for ext in [".pyw", ".hta"]:
        path = script_path.replace(".pyw", ext)
        try:
            os.remove(path)
        except Exception:
            pass

    _is_locked = False
    logger.info("Screen unlocked — all lock processes killed")


def is_locked() -> bool:
    return _is_locked
