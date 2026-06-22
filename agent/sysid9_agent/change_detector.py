import json
import logging
import os

from sysid9_agent.config import CONFIG_DIR

logger = logging.getLogger("SysID9Agent")
CACHE_FILE = os.path.join(CONFIG_DIR, "inventory_cache.json")


def load_cache() -> dict:
    if not os.path.exists(CACHE_FILE):
        return {}
    try:
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {}


def save_cache(data: dict):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(CACHE_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)


def detect_changes(current: dict, cached: dict) -> list[dict]:
    changes = []
    _compare_dict(changes, "", current, cached)
    return changes


def _compare_dict(changes: list, prefix: str, current: dict, cached: dict):
    all_keys = set(list(current.keys()) + list(cached.keys()))
    for key in all_keys:
        path = f"{prefix}.{key}" if prefix else key
        cur_val = current.get(key)
        old_val = cached.get(key)

        if isinstance(cur_val, dict) and isinstance(old_val, dict):
            _compare_dict(changes, path, cur_val, old_val)
        elif isinstance(cur_val, list) and isinstance(old_val, list):
            if len(cur_val) != len(old_val):
                changes.append({
                    "component": path,
                    "field": "count",
                    "old_value": str(len(old_val)),
                    "new_value": str(len(cur_val)),
                })
        elif str(cur_val) != str(old_val):
            changes.append({
                "component": prefix or "system",
                "field": key,
                "old_value": str(old_val) if old_val is not None else None,
                "new_value": str(cur_val) if cur_val is not None else None,
            })
