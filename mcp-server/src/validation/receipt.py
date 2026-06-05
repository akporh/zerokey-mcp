import base64
import time

from src.config import settings
from src.validation.mirror_node import ValidationError, fetch_transaction

TINYBARS_PER_HBAR = 100_000_000


async def validate_payment_receipt(
    receipt: str,
    pending: dict,
    consumed: set,
) -> tuple[bool, str | None, str | None, str | None]:
    """
    Validate an x402 payment receipt.

    receipt format: "{hedera_tx_id}:{invoice_uuid}"

    Returns (valid, invoice_uuid, failure_reason, payer_account_id).
    failure_reason and payer_account_id are for server-side use only — never sent to the client.
    """
    try:
        tx_id, invoice_uuid = receipt.split(":", 1)
    except ValueError:
        return False, None, "malformed_receipt", None

    # Replay protection — reject already-consumed UUIDs immediately
    if invoice_uuid in consumed:
        return False, None, "uuid_replayed", None

    # UUID must exist in pending and not be expired
    pending_entry = pending.get(invoice_uuid)
    if pending_entry is None:
        return False, None, "uuid_unknown", None
    if pending_entry["expires_at"] < time.time():
        return False, None, "uuid_expired", None

    try:
        data = await fetch_transaction(tx_id)
    except ValidationError as exc:
        return False, None, str(exc), None

    tx = data["transactions"][0]

    # Check 1 — transaction cleared on-chain
    if tx.get("result") != "SUCCESS":
        return False, None, "tx_not_success", None

    # Check 2 — correct destination and exact amount
    expected_tinybars = round(float(pending_entry["amount_hbar"]) * TINYBARS_PER_HBAR)
    server_account = settings["HEDERA_SERVER_ACCOUNT_ID"]
    raw_transfers = tx.get("transfers", [])
    transfers = {t["account"]: t["amount"] for t in raw_transfers}
    if transfers.get(server_account) != expected_tinybars:
        return False, None, "wrong_amount_or_destination", None

    # Check 3 — memo matches the invoice UUID for this request
    memo_raw = tx.get("memo_base64", "")
    try:
        memo = base64.b64decode(memo_raw).decode("utf-8") if memo_raw else ""
    except Exception:
        memo = ""
    if memo != invoice_uuid:
        return False, None, "uuid_mismatch", None

    # Extract payer: the account with a negative transfer that is not the network fee collector
    payer_account_id = next(
        (t["account"] for t in raw_transfers if t["amount"] < 0 and t["account"] != "0.0.98"),
        None,
    )

    return True, invoice_uuid, None, payer_account_id
