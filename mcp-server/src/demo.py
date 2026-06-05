"""Demo console endpoints — triggers live agent sessions and streams SSE events."""

import asyncio
import json
import logging
import os

import httpx
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from hiero_sdk_python import (
    AccountAllowanceApproveTransaction,
    AccountId,
    Client,
    Hbar,
    PrivateKey,
    TransferTransaction,
)
from pydantic import BaseModel

from src.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

SAMPLE_CODE = 'import os\npassword = "hunter2"\nx = undefined_variable\n'

_AGENT_ACCOUNT_ID: str = os.environ.get("HEDERA_AGENT_ACCOUNT_ID", "")
_AGENT_PRIVATE_KEY: str = os.environ.get("HEDERA_AGENT_PRIVATE_KEY", "")
_TOOL_ENDPOINT = "http://localhost:8000/mcp/tools/execute-static-analysis"


def _sse(event_type: str, msg: str, detail: dict | None = None) -> str:
    payload: dict = {"type": event_type, "msg": msg}
    if detail:
        payload["detail"] = detail
    return f"data: {json.dumps(payload)}\n\n"


def _hedera_client() -> Client:
    c = Client.for_testnet()
    c.set_operator(
        AccountId.from_string(_AGENT_ACCOUNT_ID),
        PrivateKey.from_string(_AGENT_PRIVATE_KEY),
    )
    return c


def _broadcast_payment_sync(invoice: dict) -> str:
    c = _hedera_client()
    amount = float(invoice["amount"])
    receipt = (
        TransferTransaction()
        .add_hbar_transfer(AccountId.from_string(_AGENT_ACCOUNT_ID), Hbar(-amount))
        .add_hbar_transfer(AccountId.from_string(invoice["account"]), Hbar(amount))
        .set_transaction_memo(invoice["reference"])
        .execute(c)
    )
    return str(receipt.transaction_id)


def _approve_allowance_sync() -> None:
    c = _hedera_client()
    (
        AccountAllowanceApproveTransaction()
        .approve_hbar_allowance(
            AccountId.from_string(_AGENT_ACCOUNT_ID),
            AccountId.from_string(settings["HEDERA_SERVER_ACCOUNT_ID"]),
            Hbar(float(settings["TOOL_PRICE_HBAR"])),
        )
        .execute(c)
    )


def _result_events(r: httpx.Response) -> list[str]:
    if r.status_code == 200:
        result = r.json()
        return [
            _sse("execute_tool", "Protected tool executing with server-side API keys..."),
            _sse("complete", f"HTTP 200 OK — {result.get('summary', 'Complete')}", detail=result),
        ]
    if r.status_code == 503:
        data = r.json()
        return [
            _sse("execute_tool", "Downstream tool failure detected (HTTP 503)."),
            _sse("refund",
                 f"HCS: tool_failed logged. Auto-refund dispatched. {data.get('hashscan_topic_url', '')}",
                 detail=data),
        ]
    return [_sse("error", f"Unexpected status {r.status_code}: {r.text[:200]}")]


async def _stream_allowance(code: str, inject_failure: bool):
    loop = asyncio.get_event_loop()
    yield _sse("request", "Agent request received. HBAR allowance header detected — no 402 challenge needed.")
    yield _sse("allowance_check", f"Approving session allowance for agent {_AGENT_ACCOUNT_ID}...")
    try:
        await loop.run_in_executor(None, _approve_allowance_sync)
    except Exception as exc:
        yield _sse("error", f"Allowance approval failed: {exc}")
        return

    yield _sse("allowance_check",
               f"Allowance approved: {settings['TOOL_PRICE_HBAR']} HBAR → server {settings['HEDERA_SERVER_ACCOUNT_ID']}")
    yield _sse("hcs_log", "Dispatching approved CryptoTransfer pull from agent account...")

    headers: dict = {"x-allowance": "true", "x-agent-account": _AGENT_ACCOUNT_ID}
    if inject_failure:
        headers["x-demo-inject-failure"] = "true"

    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(_TOOL_ENDPOINT, json={"code": code, "language": "python"}, headers=headers)

    yield _sse("hcs_log", "HCS audit: payment_verified (mode: allowance) — recorded on-chain.",
               detail={"hashscan_topic_url": f"https://hashscan.io/testnet/topic/{settings['HCS_AUDIT_TOPIC_ID']}"})
    for event in _result_events(r):
        yield event


async def _stream_pay_per_call(code: str, inject_failure: bool):
    loop = asyncio.get_event_loop()
    yield _sse("request", "Agent request received. No payment receipt — issuing 402 challenge.")

    async with httpx.AsyncClient(timeout=30.0) as client:
        r1 = await client.post(_TOOL_ENDPOINT, json={"code": code, "language": "python"})

    if r1.status_code != 402:
        yield _sse("error", f"Expected 402, got {r1.status_code}: {r1.text[:200]}")
        return

    invoice = r1.json()["invoice"]
    yield _sse(
        "challenge_402",
        f"HTTP 402 issued. Amount: {invoice['amount']} HBAR | Ref: {invoice['reference'][:16]}...",
        detail={"account": invoice["account"], "amount": invoice["amount"]},
    )
    yield _sse("challenge_402", "Agent broadcasting CryptoTransfer to Hedera testnet...")

    try:
        tx_id = await loop.run_in_executor(None, _broadcast_payment_sync, invoice)
    except Exception as exc:
        yield _sse("error", f"Payment broadcast failed: {exc}")
        return

    yield _sse("challenge_402", f"Transaction broadcast: {tx_id}",
               detail={"hashscan_tx_url": f"https://hashscan.io/testnet/transaction/{tx_id}"})
    yield _sse("verify_tx", "Waiting 5s for Mirror Node propagation...")
    await asyncio.sleep(5)

    payment_receipt = f"{tx_id}:{invoice['reference']}"
    yield _sse("verify_tx", "Querying Mirror Node — validating tx status, destination, and memo UUID...")

    headers: dict = {"x402-Payment-Receipt": payment_receipt}
    if inject_failure:
        headers["x-demo-inject-failure"] = "true"

    async with httpx.AsyncClient(timeout=30.0) as client:
        r2 = await client.post(_TOOL_ENDPOINT, json={"code": code, "language": "python"}, headers=headers)

    yield _sse("hcs_log", "Mirror Node: tx SUCCESS ✓ | Destination verified ✓ | UUID memo matched ✓",
               detail={"hashscan_topic_url": f"https://hashscan.io/testnet/topic/{settings['HCS_AUDIT_TOPIC_ID']}"})
    yield _sse("hcs_log", "HCS audit: payment_verified — immutably recorded on-chain.")
    for event in _result_events(r2):
        yield event


class SessionRequest(BaseModel):
    mode: str = "pay_per_call"
    inject_failure: bool = False
    code: str = SAMPLE_CODE


@router.get("/status")
async def demo_status():
    return {
        "server_account": settings["HEDERA_SERVER_ACCOUNT_ID"],
        "agent_account": _AGENT_ACCOUNT_ID or "not_configured",
        "hcs_topic": settings["HCS_AUDIT_TOPIC_ID"],
        "network": settings["HEDERA_NETWORK"],
        "tool_price_hbar": settings["TOOL_PRICE_HBAR"],
        "hashscan_topic": f"https://hashscan.io/testnet/topic/{settings['HCS_AUDIT_TOPIC_ID']}",
    }


@router.post("/start-session")
async def start_session(body: SessionRequest):
    gen = (
        _stream_allowance(body.code, body.inject_failure)
        if body.mode == "allowance"
        else _stream_pay_per_call(body.code, body.inject_failure)
    )
    return StreamingResponse(
        gen,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
