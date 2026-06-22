"""
SysID9 Host Installer
Installs the SysID9 agent as an invisible background process.
"""
import ctypes
import os
import shutil
import subprocess
import sys
import configparser
import threading
import time
import tkinter as tk
from tkinter import messagebox

INSTALL_DIR = os.path.join(os.environ.get("PROGRAMFILES", "C:\\Program Files"), "SysID9")
CONFIG_DIR = os.path.join(os.environ.get("PROGRAMDATA", "C:\\ProgramData"), "SysID9")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.ini")
AGENT_EXE_NAME = "SysID9Host.exe"
TASK_NAME = "SysID9Agent"


def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except Exception:
        return False


def get_exe_path():
    if getattr(sys, "frozen", False):
        return sys.executable
    return os.path.abspath(__file__)


def normalize_url(url):
    url = url.strip().rstrip("/")
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "http://" + url
    return url


def _read_existing_agent_id():
    """Preserve agent_id from previous installation to avoid duplicates."""
    if not os.path.exists(CONFIG_FILE):
        return ""
    try:
        config = configparser.ConfigParser()
        config.read(CONFIG_FILE, encoding="utf-8-sig")
        return config.get("agent", "id", fallback="").strip()
    except Exception:
        return ""


def _stop_previous():
    """Stop any running agent processes and scheduled tasks."""
    subprocess.run(["schtasks", "/End", "/TN", TASK_NAME], capture_output=True, timeout=10)
    subprocess.run(["schtasks", "/Delete", "/TN", TASK_NAME, "/F"], capture_output=True, timeout=10)
    subprocess.run(["sc", "stop", "SysID9Agent"], capture_output=True, timeout=10)
    subprocess.run(["sc", "delete", "SysID9Agent"], capture_output=True, timeout=10)
    subprocess.run(["taskkill", "/F", "/IM", AGENT_EXE_NAME], capture_output=True, timeout=10)
    time.sleep(2)


def install(server_url, api_key, progress_callback=None):
    steps = []

    def log(msg):
        steps.append(msg)
        if progress_callback:
            progress_callback(msg)

    server_url = normalize_url(server_url)

    try:
        # 0 — Test connection
        log(f"Testando conexão com {server_url}...")
        try:
            import urllib.request
            urllib.request.urlopen(server_url + "/api/health", timeout=5)
            log("Servidor encontrado!")
        except Exception:
            log("AVISO: Servidor não acessível. O agente tentará conectar depois.")

        # 1 — Preserve existing agent_id to avoid duplicates
        existing_agent_id = _read_existing_agent_id()
        if existing_agent_id:
            log(f"Agente existente encontrado (ID: {existing_agent_id[:8]}...)")

        # 2 — Stop previous
        log("Parando agente anterior...")
        _stop_previous()

        # 3 — Directories
        log("Criando diretórios...")
        os.makedirs(INSTALL_DIR, exist_ok=True)
        os.makedirs(CONFIG_DIR, exist_ok=True)

        # 4 — Copy executable
        log("Copiando agente...")
        src = get_exe_path()
        dest = os.path.join(INSTALL_DIR, AGENT_EXE_NAME)
        if os.path.normcase(os.path.abspath(src)) != os.path.normcase(os.path.abspath(dest)):
            for attempt in range(5):
                try:
                    shutil.copy2(src, dest)
                    break
                except PermissionError:
                    subprocess.run(["taskkill", "/F", "/IM", AGENT_EXE_NAME], capture_output=True, timeout=10)
                    time.sleep(2)
            else:
                raise PermissionError(f"Não foi possível copiar para {dest}.")

        # 5 — Write config (preserving agent_id)
        log("Salvando configuração...")
        config = configparser.ConfigParser()
        config["server"] = {
            "url": server_url,
            "api_key": api_key.strip(),
        }
        config["agent"] = {"id": existing_agent_id}
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            config.write(f)

        # 6 — Create scheduled task as SYSTEM
        #     - Runs at boot (ONSTART) — starts with Windows
        #     - Runs as SYSTEM — invisible to user, cannot be killed
        #     - Restart every 5 min if stopped — auto-recovery
        log("Configurando inicialização automática...")
        agent_exe = os.path.join(INSTALL_DIR, AGENT_EXE_NAME)

        result = subprocess.run(
            ["schtasks", "/Create",
             "/TN", TASK_NAME,
             "/TR", f'"{agent_exe}" --run',
             "/SC", "ONSTART",
             "/RU", "SYSTEM",
             "/RL", "HIGHEST",
             "/F"],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0:
            log("Tarefa agendada criada.")
        else:
            log(f"Aviso: {result.stderr.strip()}")

        # 7 — Create a watchdog task that restarts agent every 5 min if not running
        watchdog_cmd = (
            f'cmd /c "tasklist /FI \\"IMAGENAME eq {AGENT_EXE_NAME}\\" | '
            f'find /i \\"{AGENT_EXE_NAME}\\" >nul || start /b \\"\\" \\"{agent_exe}\\" --run"'
        )
        subprocess.run(
            ["schtasks", "/Create",
             "/TN", f"{TASK_NAME}_Watchdog",
             "/TR", watchdog_cmd,
             "/SC", "MINUTE",
             "/MO", "5",
             "/RU", "SYSTEM",
             "/RL", "HIGHEST",
             "/F"],
            capture_output=True, timeout=15,
        )
        log("Watchdog de auto-recuperação configurado.")

        # 8 — Registry (Programs & Features)
        log("Registrando no sistema...")
        try:
            import winreg
            key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\SysID9Agent"
            key = winreg.CreateKeyEx(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_WRITE)
            winreg.SetValueEx(key, "DisplayName", 0, winreg.REG_SZ, "SysID9 Agent")
            winreg.SetValueEx(key, "UninstallString", 0, winreg.REG_SZ, f'"{agent_exe}" --uninstall')
            winreg.SetValueEx(key, "Publisher", 0, winreg.REG_SZ, "SysID9")
            winreg.SetValueEx(key, "DisplayVersion", 0, winreg.REG_SZ, "1.0.0")
            winreg.SetValueEx(key, "InstallLocation", 0, winreg.REG_SZ, INSTALL_DIR)
            winreg.SetValueEx(key, "NoModify", 0, winreg.REG_DWORD, 1)
            winreg.SetValueEx(key, "NoRepair", 0, winreg.REG_DWORD, 1)
            winreg.CloseKey(key)
        except Exception:
            pass

        # 9 — Start agent now (invisible, detached)
        log("Iniciando agente...")
        subprocess.Popen(
            [agent_exe, "--run"],
            creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NO_WINDOW,
            close_fds=True,
        )
        time.sleep(3)

        # Verify it started
        check = subprocess.run(
            ["tasklist", "/FI", f"IMAGENAME eq {AGENT_EXE_NAME}"],
            capture_output=True, text=True, timeout=10,
        )
        if AGENT_EXE_NAME in check.stdout:
            log("Agente rodando em segundo plano (invisível).")
        else:
            log("AVISO: Agente pode não ter iniciado. Será iniciado no próximo boot.")

        log("Instalação concluída com sucesso!")
        return True, "\n".join(steps)

    except Exception as e:
        log(f"ERRO: {e}")
        return False, "\n".join(steps)


def uninstall():
    if not is_admin():
        ctypes.windll.shell32.ShellExecuteW(
            None, "runas", sys.executable, "--uninstall", None, 1
        )
        sys.exit(0)

    try:
        subprocess.run(["taskkill", "/F", "/IM", AGENT_EXE_NAME], capture_output=True, timeout=10)
        subprocess.run(["schtasks", "/Delete", "/TN", TASK_NAME, "/F"], capture_output=True, timeout=10)
        subprocess.run(["schtasks", "/Delete", "/TN", f"{TASK_NAME}_Watchdog", "/F"], capture_output=True, timeout=10)
        subprocess.run(["sc", "stop", "SysID9Agent"], capture_output=True, timeout=10)
        subprocess.run(["sc", "delete", "SysID9Agent"], capture_output=True, timeout=10)

        try:
            import winreg
            winreg.DeleteKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\SysID9Agent",
            )
        except Exception:
            pass

        shutil.rmtree(CONFIG_DIR, ignore_errors=True)
        shutil.rmtree(INSTALL_DIR, ignore_errors=True)

        ctypes.windll.user32.MessageBoxW(
            0, "SysID9 Agent desinstalado com sucesso.", "SysID9", 0x40
        )
    except Exception as e:
        ctypes.windll.user32.MessageBoxW(
            0, f"Erro na desinstalação: {e}", "SysID9", 0x10
        )
    sys.exit(0)


def run_agent():
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from sysid9_agent.main import run_as_console
    run_as_console()


def detect_server_url():
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return f"http://{local_ip}:8000"
    except Exception:
        return "http://localhost:8000"


class InstallerGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("SysID9 Agent - Instalador")
        self.root.geometry("520x520")
        self.root.resizable(False, False)
        self.root.configure(bg="#1a1a2e")
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)
        self._installing = False
        self._build_ui()
        self.root.mainloop()

    def _build_ui(self):
        bg = "#1a1a2e"
        fg = "#e0e0e0"
        accent = "#1677ff"
        entry_bg = "#16213e"

        header = tk.Frame(self.root, bg=accent, height=70)
        header.pack(fill="x")
        header.pack_propagate(False)
        tk.Label(header, text="SysID9 Agent", font=("Segoe UI", 22, "bold"),
                 bg=accent, fg="white").pack(pady=15)

        content = tk.Frame(self.root, bg=bg, padx=40, pady=20)
        content.pack(fill="both", expand=True)

        tk.Label(content, text="Instalação do Agente de Monitoramento",
                 font=("Segoe UI", 12), bg=bg, fg=fg).pack(pady=(0, 20))

        # Check if already installed
        existing_id = _read_existing_agent_id()
        if existing_id:
            tk.Label(content,
                     text=f"Atualização detectada (ID: {existing_id[:8]}...)",
                     font=("Segoe UI", 9), bg=bg, fg="#52c41a").pack(pady=(0, 10))

        tk.Label(content, text="URL do Servidor:", font=("Segoe UI", 10),
                 bg=bg, fg=fg, anchor="w").pack(fill="x")
        self.server_entry = tk.Entry(content, font=("Segoe UI", 11),
                                     bg=entry_bg, fg=fg, insertbackground=fg,
                                     relief="flat", bd=5)
        self.server_entry.insert(0, detect_server_url())
        self.server_entry.pack(fill="x", pady=(2, 15))

        tk.Label(content, text="Token de Registro:", font=("Segoe UI", 10),
                 bg=bg, fg=fg, anchor="w").pack(fill="x")
        self.key_entry = tk.Entry(content, font=("Segoe UI", 11),
                                  bg=entry_bg, fg=fg, insertbackground=fg,
                                  relief="flat", bd=5)
        self.key_entry.insert(0, "dev-agent-key-2024")
        self.key_entry.pack(fill="x", pady=(2, 10))

        tk.Label(content, text=f"Instalação: {INSTALL_DIR}",
                 font=("Segoe UI", 9), bg=bg, fg="#666").pack(anchor="w")
        tk.Label(content, text="O agente será invisível e iniciará com o Windows.",
                 font=("Segoe UI", 9, "italic"), bg=bg, fg="#888").pack(anchor="w", pady=(2, 10))

        self.log_text = tk.Text(content, height=5, font=("Consolas", 9),
                                bg="#0d1117", fg="#58a6ff", relief="flat",
                                bd=5, state="disabled", wrap="word")
        self.log_text.pack(fill="x", pady=(0, 15))

        btn_frame = tk.Frame(content, bg=bg)
        btn_frame.pack(fill="x")

        self.install_btn = tk.Button(
            btn_frame, text="Instalar", font=("Segoe UI", 12, "bold"),
            bg=accent, fg="white", relief="flat", padx=30, pady=8,
            activebackground="#4096ff", activeforeground="white",
            cursor="hand2", command=self._on_install,
        )
        self.install_btn.pack(side="right")

        self.cancel_btn = tk.Button(
            btn_frame, text="Cancelar", font=("Segoe UI", 11),
            bg="#333", fg=fg, relief="flat", padx=20, pady=8,
            cursor="hand2", command=self._on_close,
        )
        self.cancel_btn.pack(side="right", padx=(0, 10))

    def _append_log(self, msg):
        self.log_text.configure(state="normal")
        self.log_text.insert("end", msg + "\n")
        self.log_text.see("end")
        self.log_text.configure(state="disabled")

    def _on_install(self):
        server = self.server_entry.get().strip()
        key = self.key_entry.get().strip()

        if not server:
            messagebox.showwarning("Atenção", "Informe a URL do servidor.")
            return
        if not key:
            messagebox.showwarning("Atenção", "Informe o token de registro.")
            return

        self._installing = True
        self.install_btn.configure(state="disabled", text="Instalando...")
        self.cancel_btn.configure(state="disabled")
        self.server_entry.configure(state="disabled")
        self.key_entry.configure(state="disabled")

        def progress(msg):
            self.root.after(0, self._append_log, msg)

        def do_install():
            success, log = install(server, key, progress_callback=progress)
            self.root.after(0, self._install_done, success, log)

        threading.Thread(target=do_install, daemon=True).start()

    def _install_done(self, success, log):
        self._installing = False
        if success:
            messagebox.showinfo(
                "SysID9",
                "Agente instalado com sucesso!\n\n"
                "O agente está rodando em segundo plano,\n"
                "invisível ao usuário, e iniciará\n"
                "automaticamente com o Windows.\n\n"
                "Se parado, será reiniciado automaticamente\n"
                "em até 5 minutos.",
            )
            self.root.destroy()
        else:
            messagebox.showerror("Erro", f"Falha na instalação:\n\n{log}")
            self.install_btn.configure(state="normal", text="Tentar Novamente")
            self.cancel_btn.configure(state="normal")
            self.server_entry.configure(state="normal")
            self.key_entry.configure(state="normal")

    def _on_close(self):
        if self._installing:
            return
        self.root.destroy()


def main():
    args = sys.argv[1:]

    if "--uninstall" in args:
        uninstall()
        return

    if "--run" in args:
        run_agent()
        return

    if "/silent" in args or "--silent" in args:
        if not is_admin():
            ctypes.windll.shell32.ShellExecuteW(
                None, "runas", sys.executable, " ".join(f'"{a}"' for a in sys.argv[1:]), None, 0
            )
            sys.exit(0)

        server = detect_server_url()
        key = "dev-agent-key-2024"
        for arg in args:
            if arg.startswith("/server=") or arg.startswith("--server="):
                server = arg.split("=", 1)[1]
            elif arg.startswith("/token=") or arg.startswith("--token="):
                key = arg.split("=", 1)[1]

        success, _ = install(server, key)
        sys.exit(0 if success else 1)

    # GUI
    if not is_admin():
        ctypes.windll.shell32.ShellExecuteW(
            None, "runas", sys.executable, " ".join(f'"{a}"' for a in sys.argv[1:]), None, 1
        )
        sys.exit(0)

    InstallerGUI()


if __name__ == "__main__":
    main()
