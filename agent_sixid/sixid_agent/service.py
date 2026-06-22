import os
import sys
import socket
import logging
import time

import win32serviceutil
import win32service
import win32event
import servicemanager

LOG_DIR = os.path.join(os.environ.get("PROGRAMDATA", "C:\\ProgramData"), "SixID")
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "agent.log"), encoding="utf-8"),
    ],
)
logger = logging.getLogger("SixiDAgent")


class SixiDService(win32serviceutil.ServiceFramework):
    _svc_name_ = "SixiDAgent"
    _svc_display_name_ = "SixiD Agent"
    _svc_description_ = "SixiD - Agente de Gestão de Ativos e Inventário de TI"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.running = True

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        self.running = False
        win32event.SetEvent(self.stop_event)
        logger.info("Service stop requested")

    def SvcDoRun(self):
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, ""),
        )
        logger.info("Service starting...")
        self.main()

    def main(self):
        from sixid_agent.config import agent_config
        from sixid_agent.api_client import APIClient
        from sixid_agent.scheduler import AgentScheduler

        client = APIClient()

        if not agent_config.agent_id:
            logger.info("Registering with server...")
            for attempt in range(1, 61):
                if not self.running:
                    return
                agent_id = client.register(socket.gethostname())
                if agent_id:
                    agent_config.agent_id = agent_id
                    agent_config.save()
                    logger.info(f"Registered: {agent_id}")
                    break
                wait = min(attempt * 10, 300)
                logger.error(f"Registration failed (attempt {attempt}). Retry in {wait}s")
                win32event.WaitForSingleObject(self.stop_event, wait * 1000)
                if not self.running:
                    return
            else:
                logger.error("Registration failed after 60 attempts")
                return

        scheduler = AgentScheduler(client)
        client.connect_websocket(agent_config.agent_id, scheduler.on_ws_message)
        scheduler.inventory_job()
        scheduler.start()
        logger.info(f"Agent running (agent_id: {agent_config.agent_id})")

        while self.running:
            rc = win32event.WaitForSingleObject(self.stop_event, 5000)
            if rc == win32event.WAIT_OBJECT_0:
                break

        scheduler.stop()
        logger.info("Service stopped")


def install_service():
    import subprocess
    exe = os.path.join(
        os.environ.get("PROGRAMFILES", "C:\\Program Files"),
        "SixID", "SixiDHost.exe"
    )

    subprocess.run(["sc", "stop", "SixiDAgent"], capture_output=True, timeout=15)
    subprocess.run(["sc", "delete", "SixiDAgent"], capture_output=True, timeout=15)
    time.sleep(2)

    result = subprocess.run(
        ["sc", "create", "SixiDAgent",
         f"binPath={exe} --service",
         "DisplayName=SixiD Agent",
         "start=auto",
         "obj=LocalSystem"],
        capture_output=True, text=True, timeout=15,
    )

    subprocess.run(
        ["sc", "description", "SixiDAgent",
         "SixiD - Agente de Gestao de Ativos e Inventario de TI"],
        capture_output=True, timeout=10,
    )

    subprocess.run(
        ["sc", "failure", "SixiDAgent",
         "reset=86400", "actions=restart/5000/restart/10000/restart/30000"],
        capture_output=True, timeout=10,
    )

    return result.returncode == 0


def start_service():
    import subprocess
    result = subprocess.run(
        ["sc", "start", "SixiDAgent"],
        capture_output=True, text=True, timeout=30,
    )
    return result.returncode == 0


if __name__ == "__main__":
    if len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(SixiDService)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(SixiDService)
