from sixid_agent.collectors.base import BaseCollector


class MotherboardCollector(BaseCollector):
    def component_name(self) -> str:
        return "motherboard"

    def collect(self) -> dict:
        try:
            import wmi
            w = wmi.WMI()
            board = w.Win32_BaseBoard()[0]
            return {
                "motherboard": {
                    "manufacturer": board.Manufacturer.strip() if board.Manufacturer else None,
                    "model": board.Product.strip() if board.Product else None,
                    "serial": board.SerialNumber.strip() if board.SerialNumber else None,
                }
            }
        except Exception:
            return {"motherboard": None}
