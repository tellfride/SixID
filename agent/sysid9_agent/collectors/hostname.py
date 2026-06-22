import os
import socket

from sysid9_agent.collectors.base import BaseCollector


class HostnameCollector(BaseCollector):
    def component_name(self) -> str:
        return "hostname"

    def collect(self) -> dict:
        return {
            "hostname": socket.gethostname(),
            "current_user": os.environ.get("USERNAME", os.environ.get("USER", "")),
            "domain": os.environ.get("USERDOMAIN", ""),
        }
