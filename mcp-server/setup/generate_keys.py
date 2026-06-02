"""
Generates two Ed25519 key pairs for Hedera testnet accounts.
Run this once — outputs keys you need to activate at portal.hedera.com.
"""
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import (
    Encoding, PublicFormat, PrivateFormat, NoEncryption
)


def generate_hedera_keypair(label: str) -> dict:
    private_key = Ed25519PrivateKey.generate()
    private_bytes = private_key.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
    public_bytes = private_key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    return {
        "label": label,
        "private_key_hex": private_bytes.hex(),
        "public_key_hex": public_bytes.hex(),
        # Hedera DER-encoded format (prefix 302e020100300506032b657004220420 + private key hex)
        "private_key_der": "302e020100300506032b657004220420" + private_bytes.hex(),
    }


if __name__ == "__main__":
    server = generate_hedera_keypair("SERVER (MCP proxy — receives payments)")
    agent  = generate_hedera_keypair("AGENT  (demo client — pays for tools)")

    for kp in [server, agent]:
        print(f"\n{'='*60}")
        print(f"  {kp['label']}")
        print(f"{'='*60}")
        print(f"  Public key (hex):      {kp['public_key_hex']}")
        print(f"  Private key (DER hex): {kp['private_key_der']}")

    print("""
ACTION REQUIRED — TWO STEPS:
─────────────────────────────────────────────────────────────
1. Go to:  https://portal.hedera.com
   - Sign in / create a free account
   - Go to "Testnet" tab → "Create Account"
   - Paste the SERVER public key (hex) → note the Account ID (e.g. 0.0.12345)
   - Repeat for the AGENT public key → note that Account ID too
   - Both accounts get 10,000 test HBAR automatically

2. Once you have both Account IDs, run:
      .venv/bin/python setup/create_hcs_topic.py
   (It will prompt you for the IDs and keys, then write your .env file)
─────────────────────────────────────────────────────────────
""")
