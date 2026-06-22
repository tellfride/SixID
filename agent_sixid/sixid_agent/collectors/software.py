import winreg

from sixid_agent.collectors.base import BaseCollector


class SoftwareCollector(BaseCollector):
    def component_name(self) -> str:
        return "software"

    def collect(self) -> dict:
        software = {}
        paths = [
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
            (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
        ]
        for hive, path in paths:
            try:
                key = winreg.OpenKey(hive, path)
                for i in range(winreg.QueryInfoKey(key)[0]):
                    try:
                        subkey_name = winreg.EnumKey(key, i)
                        subkey = winreg.OpenKey(key, subkey_name)
                        name = self._get_value(subkey, "DisplayName")
                        if name and name not in software:
                            software[name] = {
                                "name": name,
                                "version": self._get_value(subkey, "DisplayVersion"),
                                "publisher": self._get_value(subkey, "Publisher"),
                                "install_date": self._get_value(subkey, "InstallDate"),
                            }
                        winreg.CloseKey(subkey)
                    except Exception:
                        continue
                winreg.CloseKey(key)
            except Exception:
                continue

        return {"software": list(software.values())}

    @staticmethod
    def _get_value(key, name: str) -> str | None:
        try:
            value, _ = winreg.QueryValueEx(key, name)
            return str(value).strip() if value else None
        except FileNotFoundError:
            return None
