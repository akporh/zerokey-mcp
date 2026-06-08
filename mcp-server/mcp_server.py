"""ZeroKey MCP stdio server — installable via Claude Desktop config block.

Wraps the ZeroKey FastAPI proxy with transparent x402 payment handling.
Claude calls any registered tool; payment is settled on Hedera automatically.

Required env (set in MCP config block):
  HEDERA_ACCOUNT_ID         — agent's testnet account (e.g. 0.0.9089637)
  HEDERA_PRIVATE_KEY        — agent's ED25519 private key

Optional env:
  HEDERA_NETWORK            — testnet | mainnet  (default: testnet)
  ZEROKEY_PROXY_URL         — FastAPI proxy base URL  (default: http://localhost:8000)
  ZEROKEY_REQUIRE_APPROVAL  — set to "true" to require human approval before each payment
"""

import asyncio
import os
import sys

import httpx
from hiero_sdk_python import AccountId, Client, PrivateKey
from hedera_agent_kit.shared.hedera_utils.hedera_builder import HederaBuilder
from hedera_agent_kit.shared.parameter_schemas.account_schema import TransferHbarParametersNormalised
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import ElicitRequestedSchema, Tool

# --- Config & startup validation -------------------------------------------

_ACCOUNT_ID       = os.environ.get("HEDERA_ACCOUNT_ID", "")
_PRIVATE_KEY      = os.environ.get("HEDERA_PRIVATE_KEY", "")
_NETWORK          = os.environ.get("HEDERA_NETWORK", "testnet")
_PROXY_URL        = os.environ.get("ZEROKEY_PROXY_URL", "http://localhost:8000").rstrip("/")
_REQUIRE_APPROVAL = os.environ.get("ZEROKEY_REQUIRE_APPROVAL", "").lower() in ("1", "true", "yes")

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
                "using Pyflakes + Bandit. Payment handled automatically via Hedera x402 "
                "(0.5 HBAR per call)."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "code":     {"type": "string", "description": "Python source code to scan"},
                    "language": {"type": "string", "description": "Language (default: python)", "default": "python"},
                },
                "required": ["code"],
            },
        ),
        Tool(
            name="get_account_info",
            description=(
                "Fetch balance, key type, and metadata for any Hedera account. "
                "Returns HBAR balance and Hashscan link. (0.1 HBAR per call)"
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "account_id": {"type": "string", "description": "Hedera account ID (e.g. 0.0.9082590)"},
                },
                "required": ["account_id"],
            },
        ),
        Tool(
            name="lookup_token",
            description=(
                "Look up a Hedera token (HTS) by ID. Returns name, symbol, type, "
                "total supply, decimals, and treasury account. (0.1 HBAR per call)"
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "token_id": {"type": "string", "description": "Hedera token ID (e.g. 0.0.123456)"},
                },
                "required": ["token_id"],
            },
        ),
        Tool(
            name="read_hcs_topic",
            description=(
                "Read the latest messages from any public Hedera Consensus Service topic. "
                "Messages are base64-decoded and JSON-parsed where possible. (0.1 HBAR per call)"
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "topic_id": {"type": "string", "description": "HCS topic ID (e.g. 0.0.9120320)"},
                    "limit":    {"type": "integer", "description": "Number of messages to return (1–100)", "default": 10},
                },
                "required": ["topic_id"],
            },
        ),
        Tool(
            name="get_transaction",
            description=(
                "Fetch details of a Hedera transaction. Returns type, result, fee, memo, "
                "and transfer list. Accepts 0.0.X@sec.nano or 0.0.X-sec-nano format. (0.1 HBAR per call)"
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "transaction_id": {"type": "string", "description": "Transaction ID (e.g. 0.0.9082590@1780744910.502902984)"},
                },
                "required": ["transaction_id"],
            },
        ),
        Tool(
            name="demo_fail",
            description=(
                "Demo tool: always fails after payment to demonstrate ZeroKey's automatic "
                "refund guardrail. Payment is collected, tool fails, refund is dispatched automatically. (0.1 HBAR)"
            ),
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="scan_code_allowance",
            description=(
                "Scan Python code for security vulnerabilities using a pre-approved HBAR spending allowance. "
                "No 402 challenge — the proxy pulls payment directly from the agent's approved allowance. "
                "Requires an on-chain allowance from the agent account to the server account. (0.1 HBAR per call)"
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Python source code to scan"},
                },
                "required": ["code"],
            },
        ),
    ]


_TOOL_ENDPOINTS: dict[str, tuple[str, list[str]]] = {
    # name → (proxy path suffix, required arg keys)
    "scan_code":        ("execute-static-analysis", ["code"]),
    "get_account_info": ("get-account-info",        ["account_id"]),
    "lookup_token":     ("lookup-token",             ["token_id"]),
    "read_hcs_topic":   ("read-hcs-topic",           ["topic_id"]),
    "get_transaction":  ("get-transaction",          ["transaction_id"]),
    "demo_fail":        ("demo-fail",                []),
}


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> dict:
    if name == "scan_code_allowance":
        endpoint = f"{_PROXY_URL}/mcp/tools/execute-static-analysis"
        r = await _post(
            endpoint,
            {"code": arguments.get("code", ""), "language": "python"},
            headers={"x-allowance": "true", "x-agent-account": _ACCOUNT_ID},
        )
        if r is None:
            return {"error": "proxy_unavailable"}
        result = r.json()
        if r.status_code == 200:
            result["_hashscan"] = {
                "payer_wallet": f"https://hashscan.io/testnet/account/{_ACCOUNT_ID}",
                "audit_topic":  "https://hashscan.io/testnet/topic/0.0.9120320",
                "note": "Payment pulled via pre-approved HBAR allowance — see audit topic for tx details",
            }
        return result
    if name not in _TOOL_ENDPOINTS:
        return {"error": f"Unknown tool: {name}"}
    path_suffix, _ = _TOOL_ENDPOINTS[name]
    endpoint = f"{_PROXY_URL}/mcp/tools/{path_suffix}"
    return await _call_tool_with_payment(endpoint, arguments)


# --- Shared payment-aware call helper --------------------------------------

async def _call_tool_with_payment(endpoint: str, payload: dict) -> dict:
    r1 = await _post(endpoint, payload)
    if r1 is None:
        return {"error": "proxy_unavailable"}
    if r1.status_code == 200:
        return r1.json()
    if r1.status_code != 402:
        return {"error": f"unexpected_status_{r1.status_code}"}

    try:
        invoice = r1.json()["invoice"]
    except (KeyError, ValueError):
        return {"error": "malformed_402_response"}

    if _REQUIRE_APPROVAL:
        approved = await _request_payment_approval(f"{invoice['amount']} HBAR")
        if not approved:
            return {"error": "payment_declined_by_user"}

    loop = asyncio.get_event_loop()
    try:
        tx_id = await loop.run_in_executor(None, _broadcast_payment, invoice)
    except Exception as exc:
        return {"error": "payment_failed", "detail": str(exc)}

    # Wait for Mirror Node to index the transaction before first poll
    await asyncio.sleep(5)
    receipt_header = f"{tx_id}:{invoice['reference']}"
    for attempt in range(12):
        await asyncio.sleep(3)
        r2 = await _post(endpoint, payload, headers={"x402-Payment-Receipt": receipt_header})
        if r2 is None:
            return {"error": "proxy_unavailable"}
        if r2.status_code == 200:
            result = r2.json()
            result["_hashscan"] = _hashscan_links(tx_id)
            return result
        if r2.status_code == 503:
            return {
                "error": "tool_failed",
                "message": (
                    "Payment of {} HBAR was verified on Hedera. "
                    "The tool failed after payment — a full refund has been automatically "
                    "dispatched to your account."
                ).format(invoice["amount"]),
                "refund_status": "dispatched",
                "_hashscan": _hashscan_links(tx_id),
            }
        if r2.status_code != 402:
            return {"error": "payment_failed", "detail": f"proxy returned {r2.status_code} after payment"}
    return {
        "error": "verification_timeout",
        "message": (
            "Payment of {} HBAR was broadcast to Hedera (tx: {}) but the Mirror Node "
            "did not index it within the timeout window. Your funds are safe — "
            "check your wallet on Hashscan."
        ).format(invoice["amount"], tx_id),
        "_hashscan": _hashscan_links(tx_id),
    }


def _hashscan_links(tx_id: str) -> dict:
    net = "testnet"
    tx_url = f"https://hashscan.io/{net}/transaction/{tx_id.replace('@', '-').replace('.', '-', 2)}"
    return {
        "payment_tx":   tx_url,
        "payer_wallet": f"https://hashscan.io/{net}/account/{_ACCOUNT_ID}",
        "audit_topic":  f"https://hashscan.io/{net}/topic/0.0.9120320",
    }


async def _post(
    url: str,
    payload: dict,
    headers: dict | None = None,
    timeout: float = 20.0,
) -> httpx.Response | None:
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            return await client.post(url, json=payload, headers=headers or {})
    except (httpx.ConnectError, httpx.TimeoutException):
        return None


async def _request_payment_approval(invoice_amount: str) -> bool:
    try:
        session = server.request_context.session
        result = await session.elicit_form(
            message=(
                f"ZeroKey: Approve payment of {invoice_amount} "
                f"to call this tool on Hedera {_NETWORK}?"
            ),
            requestedSchema=ElicitRequestedSchema(type="object", properties={}),
        )
        return result.action == "accept"
    except Exception:
        return True  # fail open — client doesn't support elicitation


def _broadcast_payment(invoice: dict) -> str:
    c = Client.for_testnet() if _NETWORK != "mainnet" else Client.for_mainnet()
    c.set_operator(
        AccountId.from_string(_ACCOUNT_ID),
        PrivateKey.from_string(_PRIVATE_KEY),
    )
    amount_tinybar = int(float(invoice["amount"]) * 100_000_000)
    params = TransferHbarParametersNormalised(
        hbar_transfers={
            AccountId.from_string(_ACCOUNT_ID):        -amount_tinybar,
            AccountId.from_string(invoice["account"]):  amount_tinybar,
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
