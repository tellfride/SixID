import logging
import subprocess

logger = logging.getLogger("SysID9Agent")


def _set_usbstor_start(value: int) -> bool:
    try:
        import winreg
        key = winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SYSTEM\CurrentControlSet\Services\USBSTOR",
            0, winreg.KEY_SET_VALUE,
        )
        winreg.SetValueEx(key, "Start", 0, winreg.REG_DWORD, value)
        winreg.CloseKey(key)
        return True
    except Exception as e:
        logger.error(f"Failed to set USBSTOR Start={value}: {e}")
        return False


def _eject_usb_devices():
    """Disable and re-enable USBSTOR to force-eject mounted USB storage."""
    try:
        # Stop the USBSTOR driver to unmount active USB storage
        subprocess.run(
            ["powershell", "-Command",
             "Get-PnpDevice | Where-Object { $_.Class -eq 'DiskDrive' -and $_.FriendlyName -match 'USB' } | "
             "ForEach-Object { Disable-PnpDevice -InstanceId $_.InstanceId -Confirm:$false -ErrorAction SilentlyContinue }"],
            capture_output=True, timeout=15,
        )
        logger.info("USB storage devices ejected via PnP")
    except Exception as e:
        logger.warning(f"PnP eject failed: {e}")

    try:
        # Also stop the USBSTOR service to prevent re-mount
        subprocess.run(
            ["sc", "stop", "USBSTOR"],
            capture_output=True, timeout=10,
        )
    except Exception:
        pass


def _reenable_usb_devices():
    """Re-enable USB storage PnP devices."""
    try:
        subprocess.run(
            ["powershell", "-Command",
             "Get-PnpDevice | Where-Object { $_.Class -eq 'DiskDrive' -and $_.FriendlyName -match 'USB' } | "
             "ForEach-Object { Enable-PnpDevice -InstanceId $_.InstanceId -Confirm:$false -ErrorAction SilentlyContinue }"],
            capture_output=True, timeout=15,
        )
        logger.info("USB storage devices re-enabled via PnP")
    except Exception as e:
        logger.warning(f"PnP re-enable failed: {e}")


def block_usb() -> bool:
    if not _set_usbstor_start(4):
        return False

    _eject_usb_devices()

    # Also block via Group Policy registry key
    try:
        import winreg
        key_path = r"SOFTWARE\Policies\Microsoft\Windows\RemovableStorageDevices\{53f5630d-b6bf-11d0-94f2-00a0c91efb8b}"
        try:
            key = winreg.CreateKeyEx(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_SET_VALUE)
        except Exception:
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_SET_VALUE)
        winreg.SetValueEx(key, "Deny_Read", 0, winreg.REG_DWORD, 1)
        winreg.SetValueEx(key, "Deny_Write", 0, winreg.REG_DWORD, 1)
        winreg.CloseKey(key)
        logger.info("USB blocked via Group Policy registry")
    except Exception as e:
        logger.warning(f"Group Policy USB block failed (non-critical): {e}")

    logger.info("USB storage blocked")
    return True


def unblock_usb() -> bool:
    if not _set_usbstor_start(3):
        return False

    # Remove Group Policy block
    try:
        import winreg
        key_path = r"SOFTWARE\Policies\Microsoft\Windows\RemovableStorageDevices\{53f5630d-b6bf-11d0-94f2-00a0c91efb8b}"
        try:
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_SET_VALUE)
            winreg.SetValueEx(key, "Deny_Read", 0, winreg.REG_DWORD, 0)
            winreg.SetValueEx(key, "Deny_Write", 0, winreg.REG_DWORD, 0)
            winreg.CloseKey(key)
        except Exception:
            pass
    except Exception:
        pass

    # Restart USBSTOR service
    try:
        subprocess.run(["sc", "start", "USBSTOR"], capture_output=True, timeout=10)
    except Exception:
        pass

    _reenable_usb_devices()

    logger.info("USB storage unblocked")
    return True
