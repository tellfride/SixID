import psutil

from sysid9_agent.collectors.base import BaseCollector


class StorageCollector(BaseCollector):
    def component_name(self) -> str:
        return "storage"

    def collect(self) -> dict:
        disks = []
        try:
            import wmi
            w = wmi.WMI()
            physical_disks = {d.Index: d for d in w.Win32_DiskDrive()}

            for idx, disk in physical_disks.items():
                media = self._detect_media_type(disk.MediaType, disk.Model)
                capacity_gb = round(int(disk.Size or 0) / (1024 ** 3), 2) if disk.Size else 0

                used_gb = 0
                free_gb = 0
                for partition in disk.associators("Win32_DiskDriveToDiskPartition"):
                    for logical in partition.associators("Win32_LogicalDiskToPartition"):
                        if logical.Size:
                            free_gb += int(logical.FreeSpace or 0)
                            used_gb += int(logical.Size or 0) - int(logical.FreeSpace or 0)

                disks.append({
                    "media_type": media,
                    "model": disk.Model.strip() if disk.Model else None,
                    "serial": disk.SerialNumber.strip() if disk.SerialNumber else None,
                    "capacity_gb": capacity_gb,
                    "used_gb": round(used_gb / (1024 ** 3), 2),
                    "free_gb": round(free_gb / (1024 ** 3), 2),
                    "health": "OK",
                })
        except Exception:
            for part in psutil.disk_partitions(all=False):
                try:
                    usage = psutil.disk_usage(part.mountpoint)
                    disks.append({
                        "media_type": "Unknown",
                        "model": part.device,
                        "serial": None,
                        "capacity_gb": round(usage.total / (1024 ** 3), 2),
                        "used_gb": round(usage.used / (1024 ** 3), 2),
                        "free_gb": round(usage.free / (1024 ** 3), 2),
                        "health": "OK",
                    })
                except Exception:
                    pass

        return {"storage": disks}

    @staticmethod
    def _detect_media_type(media_type: str | None, model: str | None) -> str:
        model_lower = (model or "").lower()
        if "nvme" in model_lower:
            return "NVMe"
        if "ssd" in model_lower or "solid" in model_lower:
            return "SSD"
        if media_type and "fixed" in media_type.lower():
            if "nvme" in model_lower:
                return "NVMe"
            return "HDD"
        return "HDD"
