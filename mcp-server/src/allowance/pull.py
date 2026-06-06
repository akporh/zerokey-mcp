import asyncio
import logging

from hiero_sdk_python import AccountId, Client, Hbar, PrivateKey
from hedera_agent_kit.shared.hedera_utils.hedera_builder import HederaBuilder
from hedera_agent_kit.shared.parameter_schemas.account_schema import TransferHbarWithAllowanceParametersNormalised

from src.config import settings

logger = logging.getLogger(__name__)


def _sync_pull(agent_account_id: str, amount_tinybar: int, memo: str) -> str:
    client = Client.for_testnet()
    client.set_operator(
        AccountId.from_string(settings["HEDERA_SERVER_ACCOUNT_ID"]),
        PrivateKey.from_string(settings["HEDERA_SERVER_PRIVATE_KEY"]),
    )
    params = TransferHbarWithAllowanceParametersNormalised(
        hbar_approved_transfers={AccountId.from_string(agent_account_id): -amount_tinybar},
        transaction_memo=memo,
    )
    tx = HederaBuilder.transfer_hbar_with_allowance(params)
    # Credit server account — builder handles only the approved debit side
    tx.add_hbar_transfer(
        AccountId.from_string(settings["HEDERA_SERVER_ACCOUNT_ID"]),
        Hbar(amount_tinybar / 100_000_000),
    )
    receipt = tx.execute(client)
    return str(receipt.transaction_id)


async def dispatch_allowance_pull(agent_account_id: str, amount_tinybar: int, memo: str) -> str:
    loop = asyncio.get_running_loop()
    pull_tx_id = await loop.run_in_executor(None, _sync_pull, agent_account_id, amount_tinybar, memo)
    logger.info("Allowance pull: %s ← %s (memo=%s)", pull_tx_id, agent_account_id, memo)
    return pull_tx_id
