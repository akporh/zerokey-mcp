# ZeroKey Demo Walkthrough

End-to-end demo: Claude Desktop calls `scan_code`, ZeroKey pays 0.5 HBAR on-chain, findings returned — no API key, no 402 error visible to Claude. Total time: ~30 seconds.

---

## Prerequisites

- Python 3.12 + `mcp-server/.venv` created (`pip install -r requirements.txt`)
- Hedera testnet account funded with at least 2 HBAR
- Claude Desktop installed

---

## Step 1 — Start the ZeroKey proxy server

```bash
cd mcp-server
.venv/bin/python3.12 -m uvicorn src.main:app --reload --port 8000
```

Leave this running in a terminal. You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

## Step 2 — Install ZeroKey in Claude Desktop

Open `~/Library/Application Support/Claude/claude_desktop_config.json` and add:

```json
{
  "mcpServers": {
    "zerokey": {
      "command": "/FULL/PATH/TO/mcp-server/.venv/bin/python3.12",
      "args": ["-m", "mcp_server"],
      "cwd": "/FULL/PATH/TO/mcp-server",
      "env": {
        "HEDERA_ACCOUNT_ID": "0.0.XXXXXX",
        "HEDERA_PRIVATE_KEY": "302e...",
        "HEDERA_NETWORK": "testnet"
      }
    }
  }
}
```

A ready-to-edit template is at `client/claude_desktop_config.json`.

Restart Claude Desktop. Confirm ZeroKey appears under **Settings → Developer → MCP Servers**.

---

## Step 3 — Run the demo

Paste this exact prompt into Claude Desktop:

> Scan this code for security vulnerabilities:
>
> ```python
> import sqlite3, os
> API_SECRET = "super_secret_key_12345"
> def get_user(username):
>     conn = sqlite3.connect("users.db")
>     cursor = conn.cursor()
>     query = "SELECT * FROM users WHERE username = '" + username + "'"
>     cursor.execute(query)
>     return cursor.fetchone()
> def read_config(path):
>     os.system("cat " + path)
> ```

*(Full sample with more findings is in `demo/vulnerable_code.py`.)*

---

## Step 4 — Expected output (~10–15 seconds)

Claude will call `scan_code` and return findings similar to:

```
Security issues found:

1. [HIGH] Hard-coded password — line 3 (Bandit B105)
2. [HIGH] SQL injection via string concatenation — line 7 (Bandit B608)
3. [MEDIUM] subprocess/shell call with user-controlled input — line 12 (Bandit B602)

Summary: 3 issues (2 high, 1 medium, 0 errors)
```

No 402 payment error is visible. ZeroKey paid 0.5 HBAR on the agent's behalf in the background.

---

## Step 5 — Verify on-chain

Open the HCS audit trail — every payment and tool execution is immutably recorded:

**HCS Topic:** [https://hashscan.io/testnet/topic/0.0.9120320](https://hashscan.io/testnet/topic/0.0.9120320)

You will see a `payment_verified` event followed by a `tool_executed` event, timestamped within the last 30 seconds.

The payment transaction itself is also visible on Hashscan — the ZeroKey proxy logs the transaction ID in the HCS event.

---

## Human-in-the-loop payment approval (optional)

Add `"ZEROKEY_REQUIRE_APPROVAL": "true"` to the MCP env block to enable an approval dialog before each payment. Claude Desktop will pause and show:

> ZeroKey: Approve payment of 0.5 HBAR to scan this code for security vulnerabilities? (Hedera testnet)

Accept → payment proceeds. Decline or Cancel → tool returns `{"error": "payment_declined_by_user"}`.

The template in `client/claude_desktop_config.json` has this enabled by default.

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| `scan_code` not listed in Claude | Restart Claude Desktop; verify `cwd` path is correct |
| `{"error": "proxy_unavailable"}` | FastAPI server not running on port 8000 |
| `{"error": "payment_failed"}` | Check HEDERA_ACCOUNT_ID / HEDERA_PRIVATE_KEY in config; check testnet balance |
| Mirror Node delay | Retry after 15s — testnet can lag up to 12s on congested periods |
