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
}


def _load() -> dict[str, dict]:
    if _STATE_FILE.exists():
        with open(_STATE_FILE) as f:
            return json.load(f)
    return copy.deepcopy(_DEFAULTS)


def save_registry() -> None:
    with open(_STATE_FILE, "w") as f:
        json.dump(TOOL_REGISTRY, f, indent=2)


TOOL_REGISTRY: dict[str, dict] = _load()
