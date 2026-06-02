import base64
import time

from src.config import settings
from src.validation.mirror_node import ValidationError, fetch_transaction

TINYBARS_PER_HBAR = 100_000_000


async def validate_payment_receipt(
    receipt: str,
    pending: dict,
    consumed: set,
) -> tuple[bool, str | None, str | None]:
    """
    Validate an x402 payment receipt.

    receipt format: "{hedera_tx_id}:{invoice_uuid}"

    Returns (valid, invoice_uuid, failure_reason).
    failure_reason is only for server-side logging — never sent to the client.
    """
    try:
        tx_id, invoice_uuid = receipt.split(":", 1)
    except ValueError:
        return False, None, "malformed_receipt"

    # Replay protection — reject already-consumed UUIDs immediately
    if invoice_uuid in consumed:
        return False, None, "uuid_replayed"

    # UUID must exist in pending and not be expired
    pending_entry = pending.get(invoice_uuid)
    if pending_entry is None:
        return False, None, "uuid_unknown"
    if pending_entry["expires_at"] < time.time():
        return False, None, "uuid_expired"

    try:
        data = await fetch_transaction(tx_id)
    except ValidationError as exc:
        return False, None, str(exc)

    tx = data["transactions"][0]

    # Check 1 — transaction cleared on-chain
    if tx.get("result") != "SUCCESS":
        return False, None, "tx_not_success"

    # Check 2 — correct destination and exact amount
    expected_tinybars = round(float(settings["TOOL_PRICE_HBAR"]) * TINYBARS_PER_HBAR)
    server_account = settings["HEDERA_SERVER_ACCOUNT_ID"]
    transfers = {t["account"]: t["amount"] for t in tx.get("transfers", [])}
    if transfers.get(server_account) != expected_tinybars:
        return False, None, "wrong_amount_or_destination"

    # Check 3 — memo matches the invoice UUID for this request
    memo_raw = tx.get("memo_base64", "")
    try:
        memo = base64.b64decode(memo_raw).decode("utf-8") if memo_raw else ""
    except Exception:
        memo = ""
    if memo != invoice_uuid:
        return False, None, "uuid_mismatch"

    return True, invoice_uuid, None
