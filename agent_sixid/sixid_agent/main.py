import logging
import os
import sys
import time
import socket

from sixid_agent.config import agent_config
from sixid_agent.api_client import APIClient
from sixid_agent.scheduler import AgentScheduler

LOG_DIR = os.path.join(os.environ.get("PROGRAMDATA", "C:\\ProgramData"), "SixID")
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(LOG_DIR, "agent.log"), encoding="utf-8"),
    ],
)
logger = logging.getLogger("SixiDAgent")


def _register(client, max_attempts=60):
    for attempt in range(1, max_attempts + 1):
        agent_id = client.register(socket.gethostname())
        if agent_id:
            agent_config.agent_id = agent_id
            agent_config.save()
            logger.info(f"Registered with agent_id: {agent_id}")
            return True
        wait = min(attempt * 10, 300)
        logger.error(f"Registration failed (attempt {attempt}/{max_attempts}). Retrying in {wait}s...")
        time.sleep(wait)
    return False


def run_as_console():
    logger.info("SixiD Agent starting...")
    logger.info(f"Server: {agent_config.server_url}")

    client = APIClient()

    if agent_config.agent_id:
        logger.info(f"Existing agent_id: {agent_config.agent_id}")
        ok = client.send_heartbeat(agent_config.agent_id, None, socket.gethostname())
        if not ok:
            logger.warning("Existing agent_id rejected by server. Re-registering...")
            agent_config.agent_id = ""
            agent_config.save()

    if not agent_config.agent_id:
        logger.info("Registering with server...")
        if not _register(client):
            logger.error("Registration failed. Exiting.")
            return

    scheduler = AgentScheduler(client)

    client.connect_websocket(agent_config.agent_id, scheduler.on_ws_message)

    scheduler.inventory_job()
    scheduler.start()

    logger.info(f"Agent running (agent_id: {agent_config.agent_id})")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        scheduler.stop()


def run_as_service():
    from sixid_agent.service import SixiDService
    import servicemanager
    servicemanager.Initialize()
    servicemanager.PrepareToHostSingle(SixiDService)
    servicemanager.StartServiceCtrlDispatcher()


def main():
    os.makedirs(os.path.join(os.environ.get("PROGRAMDATA", "C:\\ProgramData"), "SixID"), exist_ok=True)

    args = sys.argv[1:]

    if "--service" in args:
        run_as_service()
    elif "--run" in args:
        run_as_console()
    else:
        run_as_console()


if __name__ == "__main__":
    main()
