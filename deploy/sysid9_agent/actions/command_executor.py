import ctypes
import logging
import subprocess

from sysid9_agent.actions.screen_lock import lock_screen, unlock_screen
from sysid9_agent.actions.vnc_manager import start_vnc_service, stop_vnc_service, change_vnc_password

logger = logging.getLogger("SysID9Agent")


def execute_command(command: str, params: dict | None = None) -> dict:
    params = params or {}

    handlers = {
        "lock_screen": _handle_lock_screen,
        "unlock_screen": _handle_unlock_screen,
        "start_vnc": _handle_start_vnc,
        "stop_vnc": _handle_stop_vnc,
        "run_shell": _handle_run_shell,
        "restart": _handle_restart,
        "shutdown": _handle_shutdown,
        "create_user": _handle_create_user,
        "change_password": _handle_change_password,
        "list_users": _handle_list_users,
        "disable_user": _handle_disable_user,
        "enable_user": _handle_enable_user,
        "change_vnc_password": _handle_change_vnc_password,
        "block_input": _handle_block_input,
        "unblock_input": _handle_unblock_input,
        "block_usb": _handle_block_usb,
        "unblock_usb": _handle_unblock_usb,
    }

    handler = handlers.get(command)
    if not handler:
        return {"success": False, "result": f"Unknown command: {command}"}

    try:
        return handler(params)
    except Exception as e:
        logger.error(f"Command '{command}' failed: {e}")
        return {"success": False, "result": str(e)}


def _handle_lock_screen(params: dict) -> dict:
    message = params.get("message", "Seu computador foi bloqueado pela equipe de TI.")
    if lock_screen(message):
        return {"success": True, "result": "Screen locked"}
    return {"success": False, "result": "Failed to lock screen - could not display lock window in user session"}


def _handle_unlock_screen(params: dict) -> dict:
    unlock_screen()
    return {"success": True, "result": "Screen unlocked"}


def _handle_start_vnc(params: dict) -> dict:
    if start_vnc_service():
        return {"success": True, "result": "VNC service started"}
    return {"success": False, "result": "Failed to start VNC service"}


def _handle_stop_vnc(params: dict) -> dict:
    if stop_vnc_service():
        return {"success": True, "result": "VNC service stopped"}
    return {"success": False, "result": "Failed to stop VNC service"}


def _handle_run_shell(params: dict) -> dict:
    cmd = params.get("cmd")
    if not cmd:
        return {"success": False, "result": "No command specified"}
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
    return {
        "success": result.returncode == 0,
        "result": result.stdout[:4096] if result.stdout else result.stderr[:4096],
    }


def _handle_restart(params: dict) -> dict:
    subprocess.Popen(["shutdown", "/r", "/t", "5", "/c", "SysID9: Reiniciando..."])
    return {"success": True, "result": "Restarting in 5 seconds"}


def _handle_shutdown(params: dict) -> dict:
    subprocess.Popen(["shutdown", "/s", "/t", "5", "/c", "SysID9: Desligando..."])
    return {"success": True, "result": "Shutting down in 5 seconds"}


def _handle_create_user(params: dict) -> dict:
    username = params.get("username", "").strip()
    password = params.get("password", "").strip()
    is_admin = params.get("is_admin", True)

    if not username or not password:
        return {"success": False, "result": "Username and password are required"}

    # Create user
    result = subprocess.run(
        ["net", "user", username, password, "/add"],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        if "already exists" in result.stderr.lower() or "ja existe" in result.stderr.lower():
            return {"success": False, "result": f"Usuário '{username}' já existe"}
        return {"success": False, "result": result.stderr.strip() or result.stdout.strip()}

    # Add to administrators group if requested
    if is_admin:
        for group_name in ["Administrators", "Administradores"]:
            r = subprocess.run(
                ["net", "localgroup", group_name, username, "/add"],
                capture_output=True, text=True, timeout=15,
            )
            if r.returncode == 0:
                break

    # Set password to never expire
    subprocess.run(
        ["wmic", "useraccount", "where", f"name='{username}'", "set", "PasswordExpires=false"],
        capture_output=True, timeout=15,
    )

    logger.info(f"User '{username}' created (admin={is_admin})")
    return {"success": True, "result": f"Usuário '{username}' criado com sucesso" + (" (administrador)" if is_admin else "")}


def _handle_change_password(params: dict) -> dict:
    username = params.get("username", "").strip()
    password = params.get("password", "").strip()

    if not username or not password:
        return {"success": False, "result": "Username and password are required"}

    result = subprocess.run(
        ["net", "user", username, password],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        return {"success": False, "result": result.stderr.strip() or result.stdout.strip()}

    logger.info(f"Password changed for user '{username}'")
    return {"success": True, "result": f"Senha do usuário '{username}' alterada com sucesso"}


def _handle_list_users(params: dict) -> dict:
    result = subprocess.run(
        ["net", "user"],
        capture_output=True, text=True, timeout=15,
    )
    if result.returncode != 0:
        return {"success": False, "result": "Failed to list users"}

    # Parse user list
    lines = result.stdout.splitlines()
    users = []
    capture = False
    for line in lines:
        if "---" in line:
            capture = True
            continue
        if capture and line.strip() and "command completed" not in line.lower() and "comando" not in line.lower():
            users.extend(line.split())

    # Check which are admins
    admin_result = subprocess.run(
        ["net", "localgroup", "Administrators"],
        capture_output=True, text=True, timeout=15,
    )
    if admin_result.returncode != 0:
        admin_result = subprocess.run(
            ["net", "localgroup", "Administradores"],
            capture_output=True, text=True, timeout=15,
        )

    admins = set()
    capture = False
    for line in admin_result.stdout.splitlines():
        if "---" in line:
            capture = True
            continue
        if capture and line.strip() and "command completed" not in line.lower() and "comando" not in line.lower():
            admins.add(line.strip())

    user_list = [{"username": u, "is_admin": u in admins} for u in users if u]

    return {"success": True, "result": user_list}


def _handle_disable_user(params: dict) -> dict:
    username = params.get("username", "").strip()
    if not username:
        return {"success": False, "result": "Username is required"}

    result = subprocess.run(
        ["net", "user", username, "/active:no"],
        capture_output=True, text=True, timeout=15,
    )
    if result.returncode != 0:
        return {"success": False, "result": result.stderr.strip() or result.stdout.strip()}

    logger.info(f"User '{username}' disabled")
    return {"success": True, "result": f"Usuário '{username}' desabilitado com sucesso"}


def _handle_enable_user(params: dict) -> dict:
    username = params.get("username", "").strip()
    if not username:
        return {"success": False, "result": "Username is required"}

    result = subprocess.run(
        ["net", "user", username, "/active:yes"],
        capture_output=True, text=True, timeout=15,
    )
    if result.returncode != 0:
        return {"success": False, "result": result.stderr.strip() or result.stdout.strip()}

    logger.info(f"User '{username}' enabled")
    return {"success": True, "result": f"Usuário '{username}' habilitado com sucesso"}


def _handle_change_vnc_password(params: dict) -> dict:
    password = params.get("password", "").strip()
    if not password:
        return {"success": False, "result": "Nova senha é obrigatória"}
    if change_vnc_password(password):
        return {"success": True, "result": "Senha VNC alterada com sucesso"}
    return {"success": False, "result": "Falha ao alterar senha VNC"}


def _handle_block_input(params: dict) -> dict:
    try:
        ctypes.windll.user32.BlockInput(True)
        logger.info("Keyboard and mouse blocked")
        return {"success": True, "result": "Teclado e mouse bloqueados"}
    except Exception as e:
        return {"success": False, "result": f"Falha ao bloquear: {e}"}


def _handle_unblock_input(params: dict) -> dict:
    try:
        ctypes.windll.user32.BlockInput(False)
        logger.info("Keyboard and mouse unblocked")
        return {"success": True, "result": "Teclado e mouse desbloqueados"}
    except Exception as e:
        return {"success": False, "result": f"Falha ao desbloquear: {e}"}


def _handle_block_usb(params: dict) -> dict:
    try:
        import winreg
        key = winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SYSTEM\CurrentControlSet\Services\USBSTOR",
            0, winreg.KEY_SET_VALUE,
        )
        winreg.SetValueEx(key, "Start", 0, winreg.REG_DWORD, 4)
        winreg.CloseKey(key)
        logger.info("USB storage blocked")
        return {"success": True, "result": "Portas USB bloqueadas (pendrives e armazenamento)"}
    except Exception as e:
        return {"success": False, "result": f"Falha ao bloquear USB: {e}"}


def _handle_unblock_usb(params: dict) -> dict:
    try:
        import winreg
        key = winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SYSTEM\CurrentControlSet\Services\USBSTOR",
            0, winreg.KEY_SET_VALUE,
        )
        winreg.SetValueEx(key, "Start", 0, winreg.REG_DWORD, 3)
        winreg.CloseKey(key)
        logger.info("USB storage unblocked")
        return {"success": True, "result": "Portas USB desbloqueadas"}
    except Exception as e:
        return {"success": False, "result": f"Falha ao desbloquear USB: {e}"}
