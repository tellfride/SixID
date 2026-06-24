from abc import ABC, abstractmethod
import logging

logger = logging.getLogger("SysID9Agent")


class BaseCollector(ABC):
    @abstractmethod
    def component_name(self) -> str:
        pass

    @abstractmethod
    def collect(self) -> dict:
        pass

    def safe_collect(self) -> dict:
        try:
            return self.collect()
        except Exception as e:
            logger.error(f"Collector {self.component_name()} failed: {e}")
            return {}
