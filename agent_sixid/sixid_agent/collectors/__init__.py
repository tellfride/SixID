from sixid_agent.collectors.hostname import HostnameCollector
from sixid_agent.collectors.os_info import OSCollector
from sixid_agent.collectors.cpu import CPUCollector
from sixid_agent.collectors.ram import RAMCollector
from sixid_agent.collectors.storage import StorageCollector
from sixid_agent.collectors.network import NetworkCollector
from sixid_agent.collectors.motherboard import MotherboardCollector
from sixid_agent.collectors.bios import BIOSCollector
from sixid_agent.collectors.monitors import MonitorCollector
from sixid_agent.collectors.printers import PrinterCollector
from sixid_agent.collectors.software import SoftwareCollector
from sixid_agent.collectors.services import ServiceCollector
from sixid_agent.collectors.processes import ProcessCollector

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
