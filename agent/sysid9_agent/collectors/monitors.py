from sysid9_agent.collectors.base import BaseCollector


class MonitorCollector(BaseCollector):
    def component_name(self) -> str:
        return "monitors"

    def collect(self) -> dict:
        monitors = []
        try:
            import wmi
            w = wmi.WMI(namespace="root\\wmi")
            for monitor in w.WmiMonitorID():
                manufacturer = self._decode_wmi_array(monitor.ManufacturerName)
                model = self._decode_wmi_array(monitor.UserFriendlyName)
                serial = self._decode_wmi_array(monitor.SerialNumberID)
                monitors.append({
                    "manufacturer": manufacturer,
                    "model": model,
                    "serial": serial,
                })
        except Exception:
            try:
                import wmi as wmi_mod
                w = wmi_mod.WMI()
                for m in w.Win32_DesktopMonitor():
                    monitors.append({
                        "manufacturer": m.MonitorManufacturer,
                        "model": m.Name,
                        "serial": None,
                    })
            except Exception:
                pass
        return {"monitors": monitors}

    @staticmethod
    def _decode_wmi_array(arr) -> str | None:
        if not arr:
            return None
        try:
            return "".join(chr(c) for c in arr if c != 0).strip() or None
        except Exception:
            return None
