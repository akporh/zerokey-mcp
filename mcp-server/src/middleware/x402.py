import json
import time
from uuid import uuid4

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from src.config import settings
from src.validation.receipt import validate_payment_receipt

UUID_TTL_SECONDS = 300  # 5 minutes

_pending: dict[str, dict] = {}   # uuid -> {amount_hbar, expires_at}
_consumed: set[str] = set()


def _prune_expired() -> None:
    now = time.time()
    expired = [k for k, v in _pending.items() if v["expires_at"] < now]
    for k in expired:
        del _pending[k]


class X402Middleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: object) -> Response:
        if not (request.method == "POST" and request.url.path.startswith("/mcp/tools/")):
            return await call_next(request)

        receipt = request.headers.get("x402-payment-receipt")

        if receipt is None:
            _prune_expired()
            ref = str(uuid4())
            _pending[ref] = {
                "amount_hbar": settings["TOOL_PRICE_HBAR"],
                "expires_at": time.time() + UUID_TTL_SECONDS,
            }
            body = {
                "error": "payment_required",
                "invoice": {
                    "account": settings["HEDERA_SERVER_ACCOUNT_ID"],
                    "amount": settings["TOOL_PRICE_HBAR"],
                    "reference": ref,
                },
            }
            return Response(
                content=json.dumps(body),
                status_code=402,
                media_type="application/json",
                headers={
                    "x402-Invoice-Account": settings["HEDERA_SERVER_ACCOUNT_ID"],
                    "x402-Invoice-Amount": settings["TOOL_PRICE_HBAR"],
                    "x402-Invoice-Reference": ref,
                },
            )

        # Receipt present — validate before allowing through
        valid, invoice_uuid, reason = await validate_payment_receipt(receipt, _pending, _consumed)
        if not valid:
            print(f"[x402] payment validation failed: {reason}")
            return Response(
                content=json.dumps({"error": "payment_invalid"}),
                status_code=402,
                media_type="application/json",
            )

        # Mark UUID consumed and remove from pending
        _consumed.add(invoice_uuid)
        _pending.pop(invoice_uuid, None)

        request.state.payment_uuid = invoice_uuid
        return await call_next(request)
