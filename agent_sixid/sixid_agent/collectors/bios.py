from sixid_agent.collectors.base import BaseCollector


class BIOSCollector(BaseCollector):
    def component_name(self) -> str:
        return "bios"

    def collect(self) -> dict:
        try:
            import wmi
            w = wmi.WMI()
            bios = w.Win32_BIOS()[0]
            return {
                "bios": {
                    "manufacturer": bios.Manufacturer.strip() if bios.Manufacturer else None,
                    "version": bios.SMBIOSBIOSVersion.strip() if bios.SMBIOSBIOSVersion else None,
                    "date": bios.ReleaseDate[:8] if bios.ReleaseDate else None,
                }
            }
        except Exception:
            return {"bios": None}
