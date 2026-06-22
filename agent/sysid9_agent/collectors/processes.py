import psutil

from sysid9_agent.collectors.base import BaseCollector


class ProcessCollector(BaseCollector):
    def component_name(self) -> str:
        return "processes"

    def collect(self) -> dict:
        processes = []
        for proc in psutil.process_iter(["pid", "name", "username", "memory_percent"]):
            try:
                info = proc.info
                processes.append({
                    "pid": info["pid"],
                    "name": info["name"],
                    "username": info["username"],
                    "memory_percent": round(info["memory_percent"] or 0, 2),
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return {"processes": processes}
