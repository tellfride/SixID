import platform

from sysid9_agent.collectors.base import BaseCollector


class CPUCollector(BaseCollector):
    def component_name(self) -> str:
        return "cpu"

    def collect(self) -> dict:
        try:
            import wmi
            w = wmi.WMI()
            cpus = []
            for cpu in w.Win32_Processor():
                cpus.append({
                    "manufacturer": cpu.Manufacturer,
                    "model": cpu.Name.strip() if cpu.Name else None,
                    "cores": cpu.NumberOfCores,
                    "threads": cpu.NumberOfLogicalProcessors,
                    "frequency_mhz": cpu.MaxClockSpeed,
                })
            if cpus:
                return {"cpus": cpus}
        except Exception:
            pass

        # Fallback — get CPU name from registry or platform
        import psutil
        model = self._get_cpu_name()
        return {"cpus": [{
            "manufacturer": model.split()[0] if model else None,
            "model": model or f"CPU {psutil.cpu_count()} cores",
            "cores": psutil.cpu_count(logical=False),
            "threads": psutil.cpu_count(logical=True),
            "frequency_mhz": int(psutil.cpu_freq().max) if psutil.cpu_freq() else None,
        }]}

    @staticmethod
    def _get_cpu_name() -> str | None:
        try:
            import winreg
            key = winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"HARDWARE\DESCRIPTION\System\CentralProcessor\0",
            )
            name, _ = winreg.QueryValueEx(key, "ProcessorNameString")
            winreg.CloseKey(key)
            return name.strip()
        except Exception:
            return platform.processor() or None
