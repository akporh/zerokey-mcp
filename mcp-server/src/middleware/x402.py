import asyncio
import json
import logging
import time
from uuid import uuid4

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from src.allowance.pull import dispatch_allowance_pull
from src.audit.hcs import write_event
from src.config import settings
from src.refund.transfer import dispatch_refund
from src.registry import TOOL_REGISTRY
from src.validation.receipt import validate_payment_receipt

logger = logging.getLogger(__name__)

UUID_TTL_SECONDS = 300

_pending: dict[str, dict] = {}
_consumed: set[str] = set()


def _prune_expired() -> None:
    now = time.time()
    expired = [k for k, v in _pending.items() if v["expires_at"] < now]
    for k in expired:
        del _pending[k]


async def _handle_failure(
    payment_uuid: str,
    payer_account_id: str,
    amount_tinybar: int,
    original_tx_id: str,
    tool: str,
    mode: str | None = None,
) -> None:
    await write_event(
        "tool_failed",
        uuid=payment_uuid,
        tx_id=original_tx_id,
        tool=tool,
        amount_tinybar=amount_tinybar,
        payer=payer_account_id,
        mode=mode,
    )
    try:
        refund_tx_id = await dispatch_refund(
            payer_account_id,
            amount_tinybar,
            payment_uuid,
            original_tx_id,
        )
        await write_event(
            "refund_sent",
            uuid=payment_uuid,
            tx_id=refund_tx_id,
            amount_tinybar=amount_tinybar,
            payer=payer_account_id,
            mode=mode,
        )
    except Exception as exc:
        logger.error("Refund dispatch failed (uuid=%s): %s", payment_uuid, exc)
        await write_event("refund_failed", uuid=payment_uuid, tx_id=original_tx_id, payer=payer_account_id, mode=mode)


async def _execute_and_audit(
    request: Request,
    call_next: object,
    payment_uuid: str,
    payer_account_id: str,
    amount_tinybar: int,
    tx_id: str,
    tool_path: str,
    mode: str | None = None,
) -> Response:
    try:
        response = await call_next(request)
        downstream_failed = response.status_code >= 500
    except Exception as exc:
        logger.error("Tool execution exception (uuid=%s): %s", payment_uuid, exc)
        downstream_failed = True
        response = None

    if downstream_failed:
        asyncio.create_task(_handle_failure(
            payment_uuid, payer_account_id, amount_tinybar, tx_id, tool_path, mode
        ))
        return JSONResponse(
            status_code=503,
            content={
                "error": "downstream_failure",
                "refund_status": "dispatched",
                "hashscan_topic_url": (
                    f"https://hashscan.io/testnet/topic/{settings['HCS_AUDIT_TOPIC_ID']}"
                ),
            },
        )

    asyncio.create_task(write_event(
        "tool_executed",
        uuid=payment_uuid,
        tx_id=tx_id,
        tool=tool_path,
        amount_tinybar=amount_tinybar,
        payer=payer_account_id,
        mode=mode,
    ))
    return response


class X402Middleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: object) -> Response:
        if not (request.method == "POST" and request.url.path.startswith("/mcp/tools/")):
            return await call_next(request)

        tool_path = request.url.path
        if tool_path not in TOOL_REGISTRY:
            return JSONResponse(status_code=404, content={"error": "tool_not_found"})
        price_hbar = TOOL_REGISTRY[tool_path]["price_hbar"]
        amount_tinybar = round(price_hbar * 100_000_000)

        # ── Mode B: Allowance path ────────────────────────────────────────────
        if request.headers.get("x-allowance") == "true":
            agent_account_id = request.headers.get("x-agent-account")
            if not agent_account_id:
                return Response(
                    content=json.dumps({"error": "agent_account_missing"}),
                    status_code=402,
                    media_type="application/json",
                )

            payment_uuid = str(uuid4())
            try:
                pull_tx_id = await dispatch_allowance_pull(
                    agent_account_id, amount_tinybar, payment_uuid
                )
            except Exception as exc:
                logger.warning("Allowance pull failed (agent=%s): %s", agent_account_id, exc)
                return Response(
                    content=json.dumps({"error": "allowance_insufficient"}),
                    status_code=402,
                    media_type="application/json",
                )

            asyncio.create_task(write_event(
                "payment_verified",
                uuid=payment_uuid,
                tx_id=pull_tx_id,
                tool=tool_path,
                amount_tinybar=amount_tinybar,
                payer=agent_account_id,
                mode="allowance",
            ))

            request.state.payment_uuid = payment_uuid
            request.state.payer_account_id = agent_account_id
            request.state.amount_tinybar = amount_tinybar
            request.state.original_tx_id = pull_tx_id

            return await _execute_and_audit(
                request, call_next, payment_uuid, agent_account_id,
                amount_tinybar, pull_tx_id, tool_path, mode="allowance",
            )

        receipt = request.headers.get("x402-payment-receipt")

        # ── Mode A: No receipt — issue 402 challenge ──────────────────────────
        if receipt is None:
            _prune_expired()
            ref = str(uuid4())
            _pending[ref] = {
                "amount_hbar": price_hbar,
                "expires_at": time.time() + UUID_TTL_SECONDS,
            }
            asyncio.create_task(write_event(
                "402_issued",
                uuid=ref,
                tool=tool_path,
                amount_tinybar=amount_tinybar,
            ))
            body = {
                "error": "payment_required",
                "invoice": {
                    "account": settings["HEDERA_SERVER_ACCOUNT_ID"],
                    "amount": str(price_hbar),
                    "reference": ref,
                },
            }
            return Response(
                content=json.dumps(body),
                status_code=402,
                media_type="application/json",
                headers={
                    "x402-Invoice-Account": settings["HEDERA_SERVER_ACCOUNT_ID"],
                    "x402-Invoice-Amount": str(price_hbar),
                    "x402-Invoice-Reference": ref,
                },
            )

        # ── Mode A: Receipt present — validate ────────────────────────────────
        valid, invoice_uuid, reason, payer_account_id = await validate_payment_receipt(
            receipt, _pending, _consumed
        )
        if not valid:
            logger.warning("Payment validation failed: %s", reason)
            return Response(
                content=json.dumps({"error": "payment_invalid"}),
                status_code=402,
                media_type="application/json",
            )

        hedera_tx_id = receipt.split(":", 1)[0]

        _consumed.add(invoice_uuid)
        _pending.pop(invoice_uuid, None)

        request.state.payment_uuid = invoice_uuid
        request.state.payer_account_id = payer_account_id
        request.state.amount_tinybar = amount_tinybar
        request.state.original_tx_id = hedera_tx_id

        asyncio.create_task(write_event(
            "payment_verified",
            uuid=invoice_uuid,
            tx_id=hedera_tx_id,
            tool=tool_path,
            amount_tinybar=amount_tinybar,
            payer=payer_account_id,
        ))

        return await _execute_and_audit(
            request, call_next, invoice_uuid, payer_account_id,
            amount_tinybar, hedera_tx_id, tool_path,
        )
