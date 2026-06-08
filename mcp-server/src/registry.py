import copy
import json
import pathlib

_STATE_FILE = pathlib.Path(__file__).parent.parent / "registry_state.json"

_DEFAULTS: dict[str, dict] = {
    "/mcp/tools/execute-static-analysis": {
        "name": "execute-static-analysis",
        "description": (
            "Runs pyflakes and bandit on a Python code snippet. "
            "Returns quality issues and security vulnerabilities."
        ),
        "price_hbar": 0.50,
        "required_env_key": None,
    },
    "/mcp/tools/ocr-extract": {
        "name": "ocr-extract",
        "description": "Extracts text from an image URL using OCR. Returns plain text and word count.",
        "price_hbar": 0.25,
        "required_env_key": "OCR_SPACE_API_KEY",
    },
    "/mcp/tools/get-account-info": {
        "name": "get-account-info",
        "description": (
            "Fetch balance, key type, and metadata for any Hedera account. "
            "Returns HBAR balance and Hashscan link."
        ),
        "price_hbar": 0.10,
        "required_env_key": None,
    },
    "/mcp/tools/lookup-token": {
        "name": "lookup-token",
        "description": (
            "Look up a Hedera token (HTS) by ID. "
            "Returns name, symbol, type, supply, decimals, and treasury account."
        ),
        "price_hbar": 0.10,
        "required_env_key": None,
    },
    "/mcp/tools/read-hcs-topic": {
        "name": "read-hcs-topic",
        "description": (
            "Read the latest N messages from any public Hedera Consensus Service topic. "
            "Messages are base64-decoded."
        ),
        "price_hbar": 0.10,
        "required_env_key": None,
    },
    "/mcp/tools/get-transaction": {
        "name": "get-transaction",
        "description": (
            "Fetch details of a Hedera transaction by ID "
            "(accepts 0.0.X@sec.nano or 0.0.X-sec-nano format). "
            "Returns type, result, fee, memo, and transfers."
        ),
        "price_hbar": 0.10,
        "required_env_key": None,
    },
    "/mcp/tools/demo-fail": {
        "name": "demo-fail",
        "description": "Demo tool: always fails after payment to show automatic refund guardrail.",
        "price_hbar": 0.10,
        "required_env_key": None,
    },
}


def _load() -> dict[str, dict]:
    if _STATE_FILE.exists():
        with open(_STATE_FILE) as f:
            state = json.load(f)
        # Merge any new default tools missing from the persisted state file
        for path, entry in _DEFAULTS.items():
            if path not in state:
                state[path] = copy.deepcopy(entry)
        return state
    return copy.deepcopy(_DEFAULTS)


def save_registry() -> None:
    with open(_STATE_FILE, "w") as f:
        json.dump(TOOL_REGISTRY, f, indent=2)


TOOL_REGISTRY: dict[str, dict] = _load()
