import platform

from sysid9_agent.collectors.base import BaseCollector


class OSCollector(BaseCollector):
    def component_name(self) -> str:
        return "os"

    def collect(self) -> dict:
        try:
            import wmi
            w = wmi.WMI()
            os_info = w.Win32_OperatingSystem()[0]
            return {
                "os": {
                    "name": os_info.Caption.strip() if os_info.Caption else None,
                    "version": os_info.Version,
                    "build": os_info.BuildNumber,
                    "architecture": os_info.OSArchitecture,
                    "product_key": None,
                }
            }
        except Exception:
            return {
                "os": {
                    "name": f"{platform.system()} {platform.release()}",
                    "version": platform.version(),
                    "build": None,
                    "architecture": platform.machine(),
                    "product_key": None,
                }
            }
