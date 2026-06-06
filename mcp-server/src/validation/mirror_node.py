import base64

import httpx

from src.config import settings

TIMEOUT_SECONDS = 10
REPLAY_CHECK_TIMEOUT = 3
REPLAY_CHECK_LIMIT = 100


class ValidationError(Exception):
    pass


def _normalize_tx_id(tx_id: str) -> str:
    """Convert 0.0.X@sec.nano to 0.0.X-sec-nano for Mirror Node URL."""
    account, timestamp = tx_id.split("@")
    return f"{account}-{timestamp.replace('.', '-')}"


async def fetch_transaction(tx_id: str) -> dict:
    """Query Mirror Node for a transaction. Raises ValidationError on failure."""
    normalized = _normalize_tx_id(tx_id)
    url = f"{settings['MIRROR_NODE_URL']}/api/v1/transactions/{normalized}"

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.get(url)
    except httpx.TimeoutException:
        raise ValidationError("validation_timeout")
    except httpx.RequestError as exc:
        raise ValidationError(f"mirror_node_unreachable: {exc}")

    if response.status_code != 200:
        raise ValidationError(f"mirror_node_error: HTTP {response.status_code}")

    data = response.json()
    if not data.get("transactions"):
        raise ValidationError("transaction_not_found")

    return data


async def check_memo_replayed(invoice_uuid: str, current_tx_id: str) -> bool:
    """
    Returns True if invoice_uuid appears in any confirmed CRYPTOTRANSFER to the
    server account OTHER than current_tx_id — indicating a replayed receipt.

    Fails closed: returns True (treat as replayed) on any Mirror Node error or
    timeout, so the validation caller rejects the receipt.
    """
    normalized_current = _normalize_tx_id(current_tx_id)
    server_account = settings["HEDERA_SERVER_ACCOUNT_ID"]
    url = f"{settings['MIRROR_NODE_URL']}/api/v1/transactions"
    params = {
        "account.id": server_account,
        "transactiontype": "CRYPTOTRANSFER",
        "result": "SUCCESS",
        "order": "desc",
        "limit": REPLAY_CHECK_LIMIT,
    }

    try:
        async with httpx.AsyncClient(timeout=REPLAY_CHECK_TIMEOUT) as client:
            response = await client.get(url, params=params)
    except Exception:
        return True  # fail closed

    if response.status_code != 200:
        return True  # fail closed

    for tx in response.json().get("transactions", []):
        tx_id_raw = tx.get("transaction_id", "")
        # Mirror Node returns transaction_id in "0.0.X-sec-nano" form — same as normalized_current.
        # A direct equality check is correct; applying replace() would corrupt the account dots.
        if tx_id_raw == normalized_current:
            continue  # skip the current transaction itself

        memo_raw = tx.get("memo_base64", "")
        try:
            memo = base64.b64decode(memo_raw).decode("utf-8") if memo_raw else ""
        except Exception:
            continue

        if memo == invoice_uuid:
            return True  # UUID memo found in a prior transaction — replay

    return False
