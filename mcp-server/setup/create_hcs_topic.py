"""
Run after portal.hedera.com account activation.
Creates the HCS audit topic and writes the .env file.
"""
import sys
from pathlib import Path

ENV_PATH = Path(__file__).parent.parent / ".env"


def prompt(label: str, example: str = "") -> str:
    hint = f" (e.g. {example})" if example else ""
    value = input(f"  {label}{hint}: ").strip()
    if not value:
        print(f"  ERROR: {label} is required.")
        sys.exit(1)
    return value


def create_hcs_topic(server_account_id: str, server_private_key: str) -> str:
    from hiero_sdk_python import (
        Client,
        AccountId,
        PrivateKey,
        TopicCreateTransaction,
    )

    print("\n  Connecting to Hedera testnet...")
    client = Client.for_testnet()
    client.set_operator(
        AccountId.from_string(server_account_id),
        PrivateKey.from_string(server_private_key),
    )

    print("  Creating HCS audit topic...")
    receipt = (
        TopicCreateTransaction()
        .set_memo("x402-mcp-audit-log")
        .execute(client)
    )
    topic_id = str(receipt.topic_id)
    print(f"  HCS Topic created: {topic_id}")
    return topic_id


def write_env(values: dict):
    lines = [
        "# Hedera Network",
        f"HEDERA_NETWORK={values['network']}",
        f"HEDERA_SERVER_ACCOUNT_ID={values['server_account_id']}",
        f"HEDERA_SERVER_PRIVATE_KEY={values['server_private_key']}",
        f"HEDERA_AGENT_ACCOUNT_ID={values['agent_account_id']}",
        f"HEDERA_AGENT_PRIVATE_KEY={values['agent_private_key']}",
        "",
        "# Mirror Node",
        f"MIRROR_NODE_URL={values['mirror_node_url']}",
        "",
        "# HCS",
        f"HCS_AUDIT_TOPIC_ID={values['hcs_topic_id']}",
        "",
        "# Upstream Premium APIs",
        "CODE_ANALYSIS_API_KEY=",
        "OCR_SPACE_API_KEY=",
        "",
        "# Server Config",
        "PORT=8000",
    ]
    ENV_PATH.write_text("\n".join(lines) + "\n")
    print(f"\n  .env written to: {ENV_PATH}")


def main():
    print("\nHedera Testnet Setup — HCS Topic + .env")
    print("=" * 50)
    print("Paste the credentials from portal.hedera.com\n")
    print("  SERVER = ED25519 account (0.0.9082590)")
    print("  AGENT  = ECDSA account  (0.0.9089637)\n")

    server_account_id  = prompt("Server Account ID", "0.0.9082590")
    server_private_key = prompt("Server DER Encoded Private Key")
    agent_account_id   = prompt("Agent Account ID",  "0.0.9089637")
    agent_private_key  = prompt("Agent DER Encoded Private Key")

    topic_id = create_hcs_topic(server_account_id, server_private_key)

    write_env({
        "network":            "testnet",
        "server_account_id":  server_account_id,
        "server_private_key": server_private_key,
        "agent_account_id":   agent_account_id,
        "agent_private_key":  agent_private_key,
        "mirror_node_url":    "https://testnet.mirrornode.hedera.com",
        "hcs_topic_id":       topic_id,
    })

    print(f"""
Setup complete.
─────────────────────────────────────────────────
  HCS Topic:  {topic_id}
  Hashscan:   https://hashscan.io/testnet/topic/{topic_id}
  .env file:  {ENV_PATH}
─────────────────────────────────────────────────
Next: .venv/bin/uvicorn src.main:app --reload --port 8000
""")


if __name__ == "__main__":
    main()
