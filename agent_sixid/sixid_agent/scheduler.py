import logging

from apscheduler.schedulers.background import BackgroundScheduler

from sixid_agent.config import agent_config
from sixid_agent.api_client import APIClient
from sixid_agent.collectors import ALL_COLLECTORS
from sixid_agent.change_detector import load_cache, save_cache, detect_changes
from sixid_agent.actions.command_executor import execute_command

logger = logging.getLogger("SixiDAgent")


class AgentScheduler:
    def __init__(self, client: APIClient):
        self.client = client
        self.scheduler = BackgroundScheduler()
        self._collectors = [cls() for cls in ALL_COLLECTORS]

    def collect_inventory(self) -> dict:
        data = {"agent_id": agent_config.agent_id}
        for collector in self._collectors:
            result = collector.safe_collect()
            data.update(result)
        return data

    def heartbeat_job(self):
        if not self.client.send_ws_heartbeat():
            hostname_data = self._collectors[0].safe_collect()
            self.client.send_heartbeat(
                agent_config.agent_id,
                hostname_data.get("current_user"),
                hostname_data.get("hostname"),
            )

    def inventory_job(self):
        logger.info("Collecting full inventory...")
        data = self.collect_inventory()
        if self.client.send_inventory(data):
            save_cache(data)
            logger.info("Inventory sent successfully")
        else:
            logger.error("Failed to send inventory")

    def change_detection_job(self):
        cached = load_cache()
        if not cached:
            return
        current = self.collect_inventory()
        changes = detect_changes(current, cached)
        if changes:
            logger.info(f"Detected {len(changes)} hardware changes")
            self.client.send_inventory(current)
            save_cache(current)

    def command_poll_job(self):
        commands = self.client.poll_commands(agent_config.agent_id)
        for cmd in commands:
            command = cmd.get("command")
            params = cmd.get("params", {})
            command_id = cmd.get("id")
            logger.info(f"Executing polled command: {command} (id={command_id})")
            result = execute_command(command, params)
            if command_id:
                self.client.report_command_result(
                    agent_config.agent_id, command_id,
                    result.get("success", False), result.get("result"),
                )

    def on_ws_message(self, data: dict):
        msg_type = data.get("type")
        if msg_type == "command":
            command = data.get("command")
            params = data.get("params", {})
            command_id = data.get("id")
            logger.info(f"Received WS command: {command}")
            result = execute_command(command, params)
            if command_id:
                self.client.report_command_result(
                    agent_config.agent_id, command_id,
                    result.get("success", False), result.get("result"),
                )

    def start(self):
        self.scheduler.add_job(
            self.heartbeat_job, "interval",
            seconds=agent_config.heartbeat_interval,
            id="heartbeat",
        )
        self.scheduler.add_job(
            self.inventory_job, "interval",
            seconds=agent_config.inventory_interval,
            id="inventory",
        )
        self.scheduler.add_job(
            self.change_detection_job, "interval",
            seconds=agent_config.change_check_interval,
            id="change_detection",
        )
        self.scheduler.add_job(
            self.command_poll_job, "interval",
            seconds=agent_config.command_poll_interval,
            id="command_poll",
        )
        self.scheduler.start()
        logger.info("Scheduler started")

    def stop(self):
        self.scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
