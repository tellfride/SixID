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
            return {"cpus": cpus}
        except Exception:
            import psutil
            return {"cpus": [{
                "manufacturer": None,
                "model": None,
                "cores": psutil.cpu_count(logical=False),
                "threads": psutil.cpu_count(logical=True),
                "frequency_mhz": int(psutil.cpu_freq().max) if psutil.cpu_freq() else None,
            }]}
