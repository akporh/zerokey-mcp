# ZeroKey Demo Walkthrough

5-act end-to-end demo covering the x402 payment flow, Mirror Node tools, refund guardrail, allowance guardrail, and on-chain audit trail. Total time: ~3 minutes.

---

## Prerequisites

- Python 3.12 + `mcp-server/.venv` (`pip install -r requirements.txt`)
- Hedera testnet agent account funded with at least 5 HBAR
- Claude Desktop installed and configured (see README)
- Proxy server running on port 8000

---

## Setup

**Terminal 1 — Proxy server:**
```bash
cd mcp-server
.venv/bin/python3.12 -m uvicorn src.main:app --port 8000
```

You will see the purple startup banner listing all 7 tools.

**Terminal 2 (optional) — Split screen for recording:**
Keep Terminal 1 visible alongside Claude Desktop to show real-time payment events.

---

## Act 1 — x402 Payment Flow (`scan_code`)

**Prompt:**
> Use the scan_code tool to scan this code for security vulnerabilities:
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

**What happens:**
1. Terminal shows ⚡ PAYMENT REQUIRED — 0.50 HBAR, 402 challenge issued
2. HITL approval dialog appears (if `ZEROKEY_REQUIRE_APPROVAL=true`) — click **Accept**
3. Terminal shows 💸 PAYMENT VERIFIED — HBAR broadcast to Hedera testnet
4. Terminal shows ✅ TOOL EXECUTED — audit written to HCS topic
5. Claude returns vulnerability findings + Hashscan links for payment tx, payer wallet, and audit topic

**Expected findings:**
- `[HIGH]` Hard-coded secret — line 2 (Bandit B105)
- `[HIGH]` SQL injection — line 6 (Bandit B608)
- `[HIGH]` Shell injection via os.system — line 10 (Bandit B605)

---

## Act 2 — Mirror Node Tool (`get_account_info`)

**Prompt:**
> Use the get_account_info tool to fetch details for account 0.0.9082590

**What happens:**
1. Same x402 flow — 0.10 HBAR
2. Claude returns live account balance, key type, and Hashscan link

---

## Act 3 — Refund Guardrail (`demo_fail`)

**Prompt:**
> Use the demo_fail tool

**What happens:**
1. x402 payment flow runs — 0.10 HBAR verified on-chain
2. Tool deliberately returns a failure
3. Terminal shows ❌ TOOL FAILED — refund dispatched
4. Claude reports: payment was verified, tool failed, full refund automatically dispatched
5. No HBAR lost — guardrail worked

---

## Act 4 — Allowance Guardrail (`scan_code_allowance`)

**Prompt:**
> Use the scan_code_allowance tool to scan this code:
> ```python
> import sqlite3, os
> API_SECRET = "super_secret_key_12345"
> def get_user(username):
>     conn = sqlite3.connect("users.db")
>     cursor = conn.cursor()
>     query = "SELECT * FROM users WHERE username = '" + username + "'"
>     cursor.execute(query)
>     return cursor.fetchone()
> ```

**What happens:**
1. **No 402 challenge** — payment pulled directly via pre-approved on-chain allowance
2. Terminal shows 💸 PAYMENT VERIFIED (mode: allowance) — no ⚡ challenge box
3. Terminal shows ✅ TOOL EXECUTED
4. Claude returns findings + payer wallet and audit topic links
5. Demonstrates spend-limit guardrail: agent pre-authorised a 1 HBAR limit, server pulls within it

---

## Act 5 — On-Chain Audit Trail (`read_hcs_topic`)

**Prompt:**
> Use the read_hcs_topic tool to read the latest messages from HCS topic 0.0.9120320

**What happens:**
1. x402 payment — 0.10 HBAR
2. Claude returns the raw HCS messages showing all events from Acts 1–4:
   - `402_issued` → `payment_verified` → `tool_executed` (Acts 1, 2, 4)
   - `payment_verified` → `tool_failed` → `refund_sent` (Act 3)
3. Every event is timestamped and immutable — judges can verify independently on Hashscan

**Direct link:**
[hashscan.io/testnet/topic/0.0.9120320](https://hashscan.io/testnet/topic/0.0.9120320)

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `hedera-proxy` disconnected in Claude Desktop | Check `PYTHONPATH` is set to the `mcp-server` directory in config |
| `{"error": "proxy_unavailable"}` | Proxy not running — start uvicorn on port 8000 |
| `uuid_replayed_on_chain` in proxy logs | Mirror Node replay check timed out — proxy auto-recovers, retry |
| Tool times out in Claude Desktop | Mirror Node indexing lag on testnet — normal, retry after 10s |
| HITL dialog not showing | MCP elicitation not active in this session — tool still runs and pays correctly |
| Port 8000 already in use | `lsof -ti :8000 \| xargs kill -9` then restart proxy |
