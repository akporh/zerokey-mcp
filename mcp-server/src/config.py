import os
from dotenv import load_dotenv

load_dotenv()

REQUIRED_KEYS = [
    "HEDERA_NETWORK",
    "HEDERA_SERVER_ACCOUNT_ID",
    "HEDERA_SERVER_PRIVATE_KEY",
    "HCS_AUDIT_TOPIC_ID",
    "MIRROR_NODE_URL",
]

for _key in REQUIRED_KEYS:
    if not os.getenv(_key):
        raise RuntimeError(f"Required environment variable not set: {_key}")

settings = {key: os.getenv(key) for key in REQUIRED_KEYS}

from src.registry import TOOL_REGISTRY  # noqa: E402 — after dotenv load

for _entry in TOOL_REGISTRY.values():
    _key = _entry.get("required_env_key")
    if _key and not os.getenv(_key):
        raise RuntimeError(f"Required environment variable not set: {_key}")
