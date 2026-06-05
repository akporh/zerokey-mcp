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
import unittest.mock
import httpx
from dotenv import load_dotenv
import os

load_dotenv()

from hiero_sdk_python import (
    AccountAllowanceApproveTransaction,
    AccountId,
    Client,
    Hbar,
    PrivateKey,
    TransferTransaction,
)

SERVER_URL = "http://localhost:8000"
TOOL_ENDPOINT = f"{SERVER_URL}/mcp/tools/execute-static-analysis"

AGENT_ACCOUNT_ID = os.environ["HEDERA_AGENT_ACCOUNT_ID"]
AGENT_PRIVATE_KEY = os.environ["HEDERA_AGENT_PRIVATE_KEY"]
SERVER_ACCOUNT_ID = os.environ["HEDERA_SERVER_ACCOUNT_ID"]

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


def step5_downstream_failure_triggers_refund() -> None:
    _separator("Step 5 — Downstream failure + auto-refund")
    import asyncio
    from httpx import AsyncClient, ASGITransport

    async def _run() -> tuple[int, dict]:
        # Run in-process so unittest.mock.patch can reach the server's module.
        # Both requests share the same module-level _pending/_consumed state.
        import pathlib
        sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
        from src.main import app

        transport = ASGITransport(app=app)

        # 5a: get fresh 402 invoice from in-process server
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.post(
                "/mcp/tools/execute-static-analysis",
                json={"code": SAMPLE_CODE, "language": "python"},
            )
        assert r.status_code == 402, f"Expected 402, got {r.status_code}"
        invoice = r.json()["invoice"]
        print(f"Invoice reference: {invoice['reference']}")

        # 5b: broadcast real payment to Hedera (sync SDK — run in executor)
        loop = asyncio.get_event_loop()
        tx_id = await loop.run_in_executor(None, step2_broadcast_payment, invoice)

        # 5c: retry with receipt + mocked tool failure
        payment_receipt = f"{tx_id}:{invoice['reference']}"
        print("Waiting 5s for Mirror Node propagation...")
        await asyncio.sleep(5)

        with unittest.mock.patch(
            "src.main.run_analysis",
            side_effect=Exception("simulated upstream failure"),
        ):
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                r = await client.post(
                    "/mcp/tools/execute-static-analysis",
                    json={"code": SAMPLE_CODE, "language": "python"},
                    headers={"x402-Payment-Receipt": payment_receipt},
                )
        return r.status_code, r.json()

    status_code, body = asyncio.run(_run())
    print(f"Status: {status_code}")
    assert status_code == 503, f"Expected 503, got {status_code}\nBody: {body}"
    assert body.get("error") == "downstream_failure", f"Unexpected error field: {body}"
    assert body.get("refund_status") == "dispatched", f"Unexpected refund_status: {body}"
    print(f"Response: {body}")
    print("✓ Downstream failure correctly detected — 503 returned, refund dispatched")
    print(f"  Verify HCS on Hashscan: https://hashscan.io/testnet/topic/{os.environ.get('HCS_AUDIT_TOPIC_ID', '0.0.9120320')}")


def step6_allowance_mode() -> None:
    _separator("Step 6 — Allowance mode (6 back-to-back calls, zero 402 interrupts)")

    # 6a: approve allowance — agent signs once
    client = Client.for_testnet()
    client.set_operator(
        AccountId.from_string(AGENT_ACCOUNT_ID),
        PrivateKey.from_string(AGENT_PRIVATE_KEY),
    )
    total_hbar = 0.50 * 6  # static-analysis price × 6 calls
    (
        AccountAllowanceApproveTransaction()
        .approve_hbar_allowance(
            AccountId.from_string(AGENT_ACCOUNT_ID),
            AccountId.from_string(SERVER_ACCOUNT_ID),
            Hbar(total_hbar),
        )
        .execute(client)
    )
    print(f"Allowance approved: {total_hbar} HBAR → server {SERVER_ACCOUNT_ID}")

    # 6b: 6 back-to-back calls — all must return 200, zero 402 interrupts
    headers = {"x-allowance": "true", "x-agent-account": AGENT_ACCOUNT_ID}
    for i in range(1, 7):
        r = httpx.post(
            TOOL_ENDPOINT,
            json={"code": SAMPLE_CODE, "language": "python"},
            headers=headers,
        )
        assert r.status_code == 200, (
            f"Call {i}/6: Expected 200, got {r.status_code}\nBody: {r.text}"
        )
        print(f"  Call {i}/6: 200 ✓")

    print("✓ 6 back-to-back allowance-mode calls — zero 402 interrupts")
    print(f"  Verify HCS: https://hashscan.io/testnet/topic/{os.environ.get('HCS_AUDIT_TOPIC_ID')}")


def step7_ocr_mode_a() -> None:
    _separator("Step 7 — OCR tool, Mode A (per-call)")
    ocr_endpoint = f"{SERVER_URL}/mcp/tools/ocr-extract"
    image_url = "https://tesseract.projectnaptha.com/img/eng_bw.png"

    # 7a: Get 402 challenge — invoice must be 0.25 HBAR
    r = httpx.post(ocr_endpoint, json={"image_url": image_url})
    assert r.status_code == 402, f"Expected 402, got {r.status_code}"
    invoice = r.json()["invoice"]
    assert float(invoice["amount"]) == 0.25, f"Expected 0.25 HBAR, got {invoice['amount']}"
    print(f"Invoice amount: {invoice['amount']} HBAR ✓")

    # 7b: Broadcast payment
    tx_id = step2_broadcast_payment(invoice)

    # 7c: Retry with receipt
    print("Waiting 5s for Mirror Node propagation...")
    time.sleep(5)
    payment_receipt = f"{tx_id}:{invoice['reference']}"
    r = httpx.post(
        ocr_endpoint,
        json={"image_url": image_url},
        headers={"x402-Payment-Receipt": payment_receipt},
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}\nBody: {r.text}"
    result = r.json()
    assert result.get("tool") == "ocr-extract", f"Unexpected tool field: {result.get('tool')}"
    assert isinstance(result.get("text"), str) and len(result["text"]) > 0, "text field empty"
    assert isinstance(result.get("word_count"), int) and result["word_count"] > 0
    print(f"Extracted text (first 80 chars): {result['text'][:80]}")
    print(f"Word count: {result['word_count']}")
    print("✓ OCR tool: Mode A call returned 200 with non-empty text")
    print(f"  Verify HCS: https://hashscan.io/testnet/topic/{os.environ.get('HCS_AUDIT_TOPIC_ID')}")


def main() -> None:
    print("\n=== x402 Pay-Per-Call End-to-End Test ===")
    invoice = step1_request_without_receipt()
    tx_id = step2_broadcast_payment(invoice)
    payment_receipt = step3_retry_with_receipt(tx_id, invoice)
    step4_replay_protection(payment_receipt)
    step5_downstream_failure_triggers_refund()
    step6_allowance_mode()
    step7_ocr_mode_a()
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
