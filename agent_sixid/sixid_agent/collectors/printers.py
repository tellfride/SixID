from sixid_agent.collectors.base import BaseCollector


class PrinterCollector(BaseCollector):
    def component_name(self) -> str:
        return "printers"

    def collect(self) -> dict:
        printers = []
        try:
            import wmi
            w = wmi.WMI()
            for printer in w.Win32_Printer():
                printers.append({
                    "name": printer.Name,
                    "driver": printer.DriverName,
                    "port": printer.PortName,
                    "is_default": printer.Default,
                })
        except Exception:
            pass
        return {"printers": printers}
