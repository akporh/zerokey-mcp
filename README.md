# ZeroKey — Install Once. Pay Per Call. Zero API Keys.

An autonomous Machine-to-Machine (M2M) billing proxy that allows Model Context Protocol (MCP) clients (Claude Desktop, Cursor, custom agents) to discover and execute premium server-side tools on-demand — paid per call in HBAR via the x402 protocol on Hedera.

No API registrations. No subscriptions. No API keys exposed to the agent.

---

## How it works

```
Claude calls a tool via MCP
          ↓
ZeroKey issues x402 payment challenge
          ↓
Agent pays in HBAR using Hedera Agent Kit
          ↓
Payment verified on Mirror Node
          ↓
Tool executes — findings + Hashscan links returned (~15 seconds)
          ↓
Every event logged immutably to HCS audit topic
```

Payment is transparent to Claude. No 402 errors surface to the user.

---

## Tools

| Tool | What it does | Price | Payment mode |
|------|-------------|-------|--------------|
| `scan_code` | Python security analysis (Pyflakes + Bandit) | 0.50 HBAR | x402 receipt |
| `get_account_info` | Hedera account balance + metadata | 0.10 HBAR | x402 receipt |
| `lookup_token` | HTS token metadata | 0.10 HBAR | x402 receipt |
| `read_hcs_topic` | Read public HCS topic messages | 0.10 HBAR | x402 receipt |
| `get_transaction` | Hedera transaction details | 0.10 HBAR | x402 receipt |
| `scan_code_allowance` | Same as scan_code, paid via pre-approved allowance | 0.10 HBAR | allowance pull |
| `demo_fail` | Always fails after payment — demonstrates refund guardrail | 0.10 HBAR | x402 receipt |

---

## Payment guardrails

**Automatic refunds** — if a tool fails after payment is received, ZeroKey automatically dispatches a full HBAR refund to the agent's account. No manual intervention required.

**Spending allowances** — agents can pre-approve a spending limit via Hedera's native allowance mechanism. The proxy pulls payment within the approved limit, no 402 challenge needed. The agent's private key never leaves the client.

**Human-in-the-loop approval** — set `ZEROKEY_REQUIRE_APPROVAL=true` to enable an approval dialog before each payment via MCP elicitation. The agent pauses and asks the user to approve before broadcasting. Fails open gracefully on non-interactive clients.

---

## Audit trail

Every event is written to HCS topic `0.0.9120320` — sequenced, tamper-proof, publicly verifiable:

**[hashscan.io/testnet/topic/0.0.9120320](https://hashscan.io/testnet/topic/0.0.9120320)**

Events logged: `402_issued` → `payment_verified` → `tool_executed` (or `tool_failed` + `refund_sent`)

Every tool response includes direct Hashscan links for the payment transaction, payer wallet, and audit topic.

---

## Install in Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hedera-proxy": {
      "command": "/full/path/to/mcp-server/.venv/bin/python3.12",
      "args": ["-m", "mcp_server"],
      "env": {
        "HEDERA_ACCOUNT_ID": "your-testnet-account",
        "HEDERA_PRIVATE_KEY": "your-ecdsa-private-key",
        "HEDERA_NETWORK": "testnet",
        "ZEROKEY_PROXY_URL": "http://localhost:8000",
        "ZEROKEY_REQUIRE_APPROVAL": "true",
        "PYTHONPATH": "/full/path/to/mcp-server"
      }
    }
  }
}
```

> **Note:** `cwd` is ignored by Claude Desktop. Use `PYTHONPATH` to point at the `mcp-server` directory so Python can find the `mcp_server` module.

Restart Claude Desktop. Confirm `hedera-proxy` shows as **running** under Settings → Developer → MCP Servers.

---

## Run the proxy

```bash
cd mcp-server
.venv/bin/python3.12 -m uvicorn src.main:app --port 8000
```

You will see the startup banner listing all 7 tools and the proxy URL.

---

## Architecture

```
Claude Desktop
  └── mcp_server.py  (MCP stdio, spawned by Claude Desktop)
        ├── 7 tools — scan_code, get_account_info, lookup_token,
        │             read_hcs_topic, get_transaction, scan_code_allowance, demo_fail
        ├── x402 payment flow: 402 challenge → HBAR broadcast → receipt polling
        ├── Allowance flow: direct pull via pre-approved on-chain allowance
        ├── HITL via MCP elicitation (ZEROKEY_REQUIRE_APPROVAL=true)
        └── Hashscan links appended to every tool response

src/main.py  (FastAPI proxy, port 8000)
  └── x402 middleware — issues challenges, validates receipts, dispatches refunds
  └── HCS audit writer — every event logged to topic 0.0.9120320
  └── Tool registry — price + endpoint mapping
```

---

## Accounts (Hedera testnet)

| Role | Account |
|------|---------|
| Server (receives payment) | `0.0.9082590` |
| Agent (pays for tools) | `0.0.9089637` |
| HCS audit topic | `0.0.9120320` |

---

## Judge setup

1. `cd mcp-server && pip install -r requirements.txt`
2. Copy `.env.example` → `.env`, fill in server account credentials
3. Start proxy: `.venv/bin/python3.12 -m uvicorn src.main:app --port 8000`
4. Update `claude_desktop_config.json` with your full paths and agent account credentials
5. Restart Claude Desktop → run the demo prompts in [DEMO.md](DEMO.md)

---

## Stack

- Python 3.12 + FastAPI + Hedera Agent Kit v4
- MCP protocol (stdio transport)
- x402 payment protocol
- Hedera testnet — Mirror Node + HCS + CryptoTransfer + Allowance

---

## Bounty

Entry for [Hedera AI Agent Bounty](https://ai-bounties.hedera.com) — Week 3: MCP or x402 Agent.
Demo: [youtu.be/TYJhflMr0tA](https://youtu.be/TYJhflMr0tA)
