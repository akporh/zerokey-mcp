import asyncio
import json
import logging
from datetime import datetime, timezone

from hiero_sdk_python import AccountId, Client, PrivateKey, TopicId, TopicMessageSubmitTransaction

from src.config import settings

logger = logging.getLogger(__name__)


def _sync_submit(payload: str) -> None:
    client = Client.for_testnet()
    client.set_operator(
        AccountId.from_string(settings["HEDERA_SERVER_ACCOUNT_ID"]),
        PrivateKey.from_string(settings["HEDERA_SERVER_PRIVATE_KEY"]),
    )
    topic_id = TopicId.from_string(settings["HCS_AUDIT_TOPIC_ID"])
    (
        TopicMessageSubmitTransaction()
        .set_topic_id(topic_id)
        .set_message(payload)
        .execute(client)
    )


async def write_event(
    event_type: str,
    *,
    uuid: str,
    tx_id: str | None = None,
    tool: str | None = None,
    amount_tinybar: int | None = None,
    payer: str | None = None,
) -> None:
    payload = json.dumps({
        "event": event_type,
        "uuid": uuid,
        "tx_id": tx_id,
        "tool": tool,
        "amount_tinybar": amount_tinybar,
        "payer": payer,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _sync_submit, payload)
    except Exception as exc:
        logger.error("HCS write failed [%s uuid=%s]: %s", event_type, uuid, exc)
