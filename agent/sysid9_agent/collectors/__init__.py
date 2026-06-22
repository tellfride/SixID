from sysid9_agent.collectors.hostname import HostnameCollector
from sysid9_agent.collectors.os_info import OSCollector
from sysid9_agent.collectors.cpu import CPUCollector
from sysid9_agent.collectors.ram import RAMCollector
from sysid9_agent.collectors.storage import StorageCollector
from sysid9_agent.collectors.network import NetworkCollector
from sysid9_agent.collectors.motherboard import MotherboardCollector
from sysid9_agent.collectors.bios import BIOSCollector
from sysid9_agent.collectors.monitors import MonitorCollector
from sysid9_agent.collectors.printers import PrinterCollector
from sysid9_agent.collectors.software import SoftwareCollector
from sysid9_agent.collectors.services import ServiceCollector
from sysid9_agent.collectors.processes import ProcessCollector

ALL_COLLECTORS = [
    HostnameCollector,
    OSCollector,
    CPUCollector,
    RAMCollector,
    StorageCollector,
    NetworkCollector,
    MotherboardCollector,
    BIOSCollector,
    MonitorCollector,
    PrinterCollector,
    SoftwareCollector,
    ServiceCollector,
    ProcessCollector,
]
