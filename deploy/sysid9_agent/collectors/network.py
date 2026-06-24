import psutil
import socket

from sysid9_agent.collectors.base import BaseCollector


class NetworkCollector(BaseCollector):
    def component_name(self) -> str:
        return "network"

    def collect(self) -> dict:
        adapters = []
        try:
            import wmi
            w = wmi.WMI()
            for nic in w.Win32_NetworkAdapterConfiguration(IPEnabled=True):
                ip = nic.IPAddress[0] if nic.IPAddress else None
                adapters.append({
                    "adapter_name": nic.Description,
                    "ip_address": ip,
                    "mac_address": nic.MACAddress,
                    "gateway": nic.DefaultIPGateway[0] if nic.DefaultIPGateway else None,
                    "dns": ", ".join(nic.DNSServerSearchOrder) if nic.DNSServerSearchOrder else None,
                    "adapter_type": "Ethernet",
                })
        except Exception:
            addrs = psutil.net_if_addrs()
            stats = psutil.net_if_stats()
            for iface, addr_list in addrs.items():
                if iface == "lo" or not stats.get(iface, None) or not stats[iface].isup:
                    continue
                ip = mac = None
                for addr in addr_list:
                    if addr.family == socket.AF_INET:
                        ip = addr.address
                    elif addr.family == psutil.AF_LINK:
                        mac = addr.address
                if ip:
                    adapters.append({
                        "adapter_name": iface,
                        "ip_address": ip,
                        "mac_address": mac,
                        "gateway": None,
                        "dns": None,
                        "adapter_type": "Ethernet",
                    })

        return {"networks": adapters}
