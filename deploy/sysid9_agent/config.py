import configparser
import os
import uuid

CONFIG_DIR = os.path.join(os.environ.get("PROGRAMDATA", "C:\\ProgramData"), "SysID9")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.ini")


class AgentConfig:
    def __init__(self):
        self.server_url = "http://localhost:8000"
        self.agent_key = "dev-agent-key-2024"
        self.agent_id = ""
        self.heartbeat_interval = 60
        self.inventory_interval = 21600
        self.change_check_interval = 1800
        self.command_poll_interval = 30
        self.load()

    def load(self):
        if not os.path.exists(CONFIG_FILE):
            return
        config = configparser.ConfigParser()
        config.read(CONFIG_FILE, encoding="utf-8-sig")
        if "server" in config:
            self.server_url = config["server"].get("url", self.server_url)
            self.agent_key = config["server"].get("api_key", self.agent_key)
        if "agent" in config:
            self.agent_id = config["agent"].get("id", "")

    def save(self):
        os.makedirs(CONFIG_DIR, exist_ok=True)
        config = configparser.ConfigParser()
        config["server"] = {
            "url": self.server_url,
            "api_key": self.agent_key,
        }
        config["agent"] = {
            "id": self.agent_id,
        }
        with open(CONFIG_FILE, "w") as f:
            config.write(f)

    def ensure_agent_id(self):
        if not self.agent_id:
            self.agent_id = str(uuid.uuid4())
            self.save()


agent_config = AgentConfig()
