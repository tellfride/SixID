import psutil

from sysid9_agent.collectors.base import BaseCollector


class ServiceCollector(BaseCollector):
    def component_name(self) -> str:
        return "services"

    def collect(self) -> dict:
        services = []
        try:
            import wmi
            w = wmi.WMI()
            for svc in w.Win32_Service():
                services.append({
                    "name": svc.Name,
                    "display_name": svc.DisplayName,
                    "status": svc.State,
                    "start_type": svc.StartMode,
                })
        except Exception:
            for svc in psutil.win_service_iter():
                try:
                    info = svc.as_dict()
                    services.append({
                        "name": info.get("name"),
                        "display_name": info.get("display_name"),
                        "status": info.get("status"),
                        "start_type": info.get("start_type"),
                    })
                except Exception:
                    continue
        return {"services": services}
