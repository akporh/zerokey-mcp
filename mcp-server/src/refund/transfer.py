import asyncio
import logging

from hiero_sdk_python import AccountId, Client, Hbar, PrivateKey, TransferTransaction

from src.config import settings

logger = logging.getLogger(__name__)


def _sync_refund(payer_account_id: str, amount_tinybar: int) -> str:
    client = Client.for_testnet()
    client.set_operator(
        AccountId.from_string(settings["HEDERA_SERVER_ACCOUNT_ID"]),
        PrivateKey.from_string(settings["HEDERA_SERVER_PRIVATE_KEY"]),
    )
    amount_hbar = amount_tinybar / 100_000_000
    receipt = (
        TransferTransaction()
        .add_hbar_transfer(AccountId.from_string(settings["HEDERA_SERVER_ACCOUNT_ID"]), Hbar(-amount_hbar))
        .add_hbar_transfer(AccountId.from_string(payer_account_id), Hbar(amount_hbar))
        .execute(client)
    )
    return str(receipt.transaction_id)


async def dispatch_refund(
    payer_account_id: str,
    amount_tinybar: int,
    uuid: str,
    original_tx_id: str,
) -> str:
    loop = asyncio.get_event_loop()
    refund_tx_id = await loop.run_in_executor(None, _sync_refund, payer_account_id, amount_tinybar)
    logger.info("Refund dispatched: %s → %s (uuid=%s)", refund_tx_id, payer_account_id, uuid)
    return refund_tx_id
