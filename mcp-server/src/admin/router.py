import os
import pathlib
from typing import Optional

from dotenv import set_key
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.registry import TOOL_REGISTRY, save_registry

router = APIRouter()

_ENV_PATH = pathlib.Path(__file__).parent.parent.parent / ".env"


class RegistryPatchBody(BaseModel):
    price_hbar: Optional[float] = None
    api_key_value: Optional[str] = None


def _tool_entry(path: str, entry: dict) -> dict:
    env_key = entry.get("required_env_key")
    return {
        "path": path,
        "name": entry["name"],
        "description": entry["description"],
        "price_hbar": entry["price_hbar"],
        "required_env_key": env_key,
        "api_key_set": bool(env_key and os.environ.get(env_key)),
    }


@router.get("/registry")
async def get_registry():
    return {"tools": [_tool_entry(path, entry) for path, entry in TOOL_REGISTRY.items()]}


@router.patch("/registry/{tool_name}")
async def patch_tool(tool_name: str, body: RegistryPatchBody):
    path = f"/mcp/tools/{tool_name}"
    if path not in TOOL_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")

    entry = TOOL_REGISTRY[path]

    if body.price_hbar is not None:
        entry["price_hbar"] = body.price_hbar
        save_registry()

    if body.api_key_value is not None:
        env_key = entry.get("required_env_key")
        if not env_key:
            raise HTTPException(status_code=400, detail="This tool has no required_env_key")
        os.environ[env_key] = body.api_key_value
        set_key(str(_ENV_PATH), env_key, body.api_key_value)

    return {"ok": True, "path": path}
