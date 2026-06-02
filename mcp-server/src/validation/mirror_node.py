import httpx

from src.config import settings

TIMEOUT_SECONDS = 10


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
