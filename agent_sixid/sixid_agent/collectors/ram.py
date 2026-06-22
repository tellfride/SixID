import psutil

from sixid_agent.collectors.base import BaseCollector


class RAMCollector(BaseCollector):
    def component_name(self) -> str:
        return "ram"

    def collect(self) -> dict:
        mem = psutil.virtual_memory()
        result = {
            "ram": {
                "total_gb": round(mem.total / (1024 ** 3), 2),
                "used_gb": round(mem.used / (1024 ** 3), 2),
                "free_gb": round(mem.available / (1024 ** 3), 2),
            },
            "ram_slots": [],
        }

        try:
            import wmi
            w = wmi.WMI()
            for slot in w.Win32_PhysicalMemory():
                result["ram_slots"].append({
                    "slot": slot.DeviceLocator,
                    "size_gb": round(int(slot.Capacity or 0) / (1024 ** 3), 2),
                    "type": self._memory_type(slot.SMBIOSMemoryType),
                    "speed_mhz": slot.Speed,
                    "manufacturer": slot.Manufacturer.strip() if slot.Manufacturer else None,
                })
        except Exception:
            pass

        return result

    @staticmethod
    def _memory_type(type_code) -> str:
        types = {20: "DDR", 21: "DDR2", 24: "DDR3", 26: "DDR4", 34: "DDR5"}
        return types.get(type_code, f"Type-{type_code}" if type_code else "Unknown")
