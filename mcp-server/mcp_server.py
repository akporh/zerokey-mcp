"""ZeroKey MCP stdio server — installable via Claude Desktop config block.

Wraps the ZeroKey FastAPI proxy with transparent x402 payment handling.
Claude calls scan_code; payment is settled on Hedera automatically.

Required env (set in MCP config block):
  HEDERA_ACCOUNT_ID   — agent's testnet account (e.g. 0.0.9089637)
  HEDERA_PRIVATE_KEY  — agent's ED25519 private key

Optional env:
  HEDERA_NETWORK      — testnet | mainnet  (default: testnet)
  ZEROKEY_PROXY_URL   — FastAPI proxy base URL  (default: http://localhost:8000)
"""

import asyncio
import json
import os
import sys

import httpx
from hiero_sdk_python import AccountId, Client, PrivateKey
from hedera_agent_kit.shared.hedera_utils.hedera_builder import HederaBuilder
from hedera_agent_kit.shared.parameter_schemas.account_schema import TransferHbarParametersNormalised
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool

# --- Config & startup validation -------------------------------------------

_ACCOUNT_ID  = os.environ.get("HEDERA_ACCOUNT_ID", "")
_PRIVATE_KEY = os.environ.get("HEDERA_PRIVATE_KEY", "")
_NETWORK     = os.environ.get("HEDERA_NETWORK", "testnet")
_PROXY_URL   = os.environ.get("ZEROKEY_PROXY_URL", "http://localhost:8000").rstrip("/")

for _required in ("HEDERA_ACCOUNT_ID", "HEDERA_PRIVATE_KEY"):
    if not os.environ.get(_required):
        sys.exit(f"[ZeroKey] Missing required env var: {_required}")

# --- MCP server setup -------------------------------------------------------

server = Server("zerokey")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="scan_code",
            description=(
                "Scan Python code for security vulnerabilities and quality issues "
                "using Pyflakes + Bandit. Payment is handled automatically via Hedera x402 "
                "(0.5 HBAR per call). Returns issues list and summary."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "code":     {"type": "string", "description": "Python source code to scan"},
                    "language": {"type": "string", "description": "Language (default: python)", "default": "python"},
                },
                "required": ["code"],
            },
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> dict:
    if name != "scan_code":
        return {"error": f"Unknown tool: {name}"}
    return await _scan_code_with_payment(
        arguments["code"],
        arguments.get("language", "python"),
    )


# --- Payment-aware tool handler --------------------------------------------

async def _scan_code_with_payment(code: str, language: str) -> dict:
    endpoint = f"{_PROXY_URL}/mcp/tools/execute-static-analysis"
    payload  = {"code": code, "language": language}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r1 = await client.post(endpoint, json=payload)
    except (httpx.ConnectError, httpx.TimeoutException):
        return {"error": "proxy_unavailable"}

    if r1.status_code == 200:
        return r1.json()

    if r1.status_code != 402:
        return {"error": f"unexpected_status_{r1.status_code}"}

    # --- x402 challenge received ---
    try:
        invoice = r1.json()["invoice"]
    except (KeyError, ValueError):
        return {"error": "malformed_402_response"}

    # Pay on a thread (Hedera SDK is synchronous)
    loop = asyncio.get_event_loop()
    try:
        tx_id = await loop.run_in_executor(None, _broadcast_payment, invoice)
    except Exception as exc:
        return {"error": "payment_failed", "detail": str(exc)}

    # Wait for Mirror Node propagation (matches test_client.py timing)
    await asyncio.sleep(8)

    receipt_header = f"{tx_id}:{invoice['reference']}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r2 = await client.post(
                endpoint,
                json=payload,
                headers={"x402-Payment-Receipt": receipt_header},
            )
    except (httpx.ConnectError, httpx.TimeoutException):
        return {"error": "proxy_unavailable"}

    if r2.status_code == 200:
        return r2.json()

    return {"error": "payment_failed", "detail": f"proxy returned {r2.status_code} after payment"}


def _broadcast_payment(invoice: dict) -> str:
    """Sign and broadcast CryptoTransfer; returns transaction ID string."""
    c = Client.for_testnet() if _NETWORK != "mainnet" else Client.for_mainnet()
    c.set_operator(
        AccountId.from_string(_ACCOUNT_ID),
        PrivateKey.from_string(_PRIVATE_KEY),
    )
    amount_tinybar = int(float(invoice["amount"]) * 100_000_000)
    params = TransferHbarParametersNormalised(
        hbar_transfers={
            AccountId.from_string(_ACCOUNT_ID):      -amount_tinybar,
            AccountId.from_string(invoice["account"]): amount_tinybar,
        },
        transaction_memo=invoice["reference"],
    )
    receipt = HederaBuilder.transfer_hbar(params).execute(c)
    return str(receipt.transaction_id)


# --- Entry point -----------------------------------------------------------

async def _main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(_main())
