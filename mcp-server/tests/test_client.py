"""
End-to-end x402 pay-per-call test client.

Usage:
    python tests/test_client.py

Steps:
    1. Call tool without receipt → expect 402 + invoice
    2. Broadcast CryptoTransfer with invoice UUID as memo
    3. Retry with payment receipt → expect 200 + tool result
    4. Replay same receipt → expect 402 (replay protection)
"""

import sys
import time
import httpx
from dotenv import load_dotenv
import os

load_dotenv()

from hiero_sdk_python import (
    Client,
    AccountId,
    PrivateKey,
    TransferTransaction,
    Hbar,
)

SERVER_URL = "http://localhost:8000"
TOOL_ENDPOINT = f"{SERVER_URL}/mcp/tools/execute-static-analysis"

AGENT_ACCOUNT_ID = os.environ["HEDERA_AGENT_ACCOUNT_ID"]
AGENT_PRIVATE_KEY = os.environ["HEDERA_AGENT_PRIVATE_KEY"]

SAMPLE_CODE = """
import os
password = "hunter2"
x = undefined_variable
"""


def _separator(title: str) -> None:
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print('─' * 60)


def step1_request_without_receipt() -> dict:
    _separator("Step 1 — Request without payment receipt")
    r = httpx.post(TOOL_ENDPOINT, json={"code": SAMPLE_CODE, "language": "python"})
    print(f"Status: {r.status_code}")
    assert r.status_code == 402, f"Expected 402, got {r.status_code}"

    invoice = r.json()["invoice"]
    print(f"Invoice account:   {invoice['account']}")
    print(f"Invoice amount:    {invoice['amount']} HBAR")
    print(f"Invoice reference: {invoice['reference']}")
    assert "x402-invoice-account" in r.headers
    assert "x402-invoice-amount" in r.headers
    assert "x402-invoice-reference" in r.headers
    print("✓ 402 challenge received with correct headers")
    return invoice


def step2_broadcast_payment(invoice: dict) -> str:
    _separator("Step 2 — Broadcast CryptoTransfer")
    client = Client.for_testnet()
    client.set_operator(
        AccountId.from_string(AGENT_ACCOUNT_ID),
        PrivateKey.from_string(AGENT_PRIVATE_KEY),
    )

    amount_hbar = float(invoice["amount"])
    receipt = (
        TransferTransaction()
        .add_hbar_transfer(AccountId.from_string(AGENT_ACCOUNT_ID), Hbar(-amount_hbar))
        .add_hbar_transfer(AccountId.from_string(invoice["account"]), Hbar(amount_hbar))
        .set_transaction_memo(invoice["reference"])
        .execute(client)
    )

    tx_id = str(receipt.transaction_id)
    print(f"Transaction ID: {tx_id}")
    print(f"Hashscan: https://hashscan.io/testnet/transaction/{tx_id}")
    print("✓ CryptoTransfer broadcast successful")
    return tx_id


def step3_retry_with_receipt(tx_id: str, invoice: dict) -> dict:
    _separator("Step 3 — Retry with payment receipt")
    payment_receipt = f"{tx_id}:{invoice['reference']}"
    print(f"x402-Payment-Receipt: {payment_receipt}")

    print("Waiting 5s for Mirror Node propagation...")
    time.sleep(5)

    r = httpx.post(
        TOOL_ENDPOINT,
        json={"code": SAMPLE_CODE, "language": "python"},
        headers={"x402-Payment-Receipt": payment_receipt},
    )
    print(f"Status: {r.status_code}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}\nBody: {r.text}"
    result = r.json()
    print(f"Tool result summary: {result.get('summary')}")
    print("✓ Tool executed successfully after payment verification")
    return payment_receipt


def step4_replay_protection(payment_receipt: str) -> None:
    _separator("Step 4 — Replay protection")
    r = httpx.post(
        TOOL_ENDPOINT,
        json={"code": SAMPLE_CODE, "language": "python"},
        headers={"x402-Payment-Receipt": payment_receipt},
    )
    print(f"Status: {r.status_code}")
    assert r.status_code == 402, f"Expected 402 (replay blocked), got {r.status_code}"
    print(f"Error: {r.json().get('error')}")
    print("✓ Replay correctly blocked")


def main() -> None:
    print("\n=== x402 Pay-Per-Call End-to-End Test ===")
    invoice = step1_request_without_receipt()
    tx_id = step2_broadcast_payment(invoice)
    payment_receipt = step3_retry_with_receipt(tx_id, invoice)
    step4_replay_protection(payment_receipt)
    print("\n=== ALL STEPS PASSED ===\n")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as exc:
        print(f"\n✗ FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print(f"\n✗ ERROR: {exc}", file=sys.stderr)
        raise
