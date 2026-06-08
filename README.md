# ZeroKey — Install Once. Pay Per Call. Zero API Keys.

An autonomous Machine-to-Machine (M2M) billing proxy that allows Model Context Protocol (MCP) clients (such as Claude Desktop, Cursor, or custom LangGraph/CrewAI engines) to discover and execute premium, server-side developer utilities entirely on-demand. 

By natively implementing the **x402 (HTTP 402 Payment Required)** protocol spec alongside **Hedera Agent Kit** ledger tools, this system completely eliminates the need for human developers to manage external SaaS subscriptions, register billing credit cards, or expose sensitive API keys to their local AI agent

---
Install into Claude Desktop or Cursor. Your coding agent gets access to premium tools - code analysis, OCR, and more - paid per-use in HBAR via Hedera x402. No API registrations. No subscriptions. One config block.

## Install in 60 seconds

Add this block to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zerokey": {
      "command": "python",
      "args": ["-m", "mcp_server"],
      "cwd": "/path/to/this/repo/mcp-server",
      "env": {
        "HEDERA_ACCOUNT_ID": "your-testnet-account",
        "HEDERA_PRIVATE_KEY": "your-ed25519-private-key",
        "HEDERA_NETWORK": "testnet"
      }
    }
  }
}
```

Restart Claude Desktop. Ask Claude to scan your code. Watch it pay and return findings - no API key setup required.

## How it works

```
You: "Scan this code for vulnerabilities"
                    ↓
Claude calls  scan_code  via MCP
                    ↓
ZeroKey issues x402 payment challenge (0.5 HBAR)
                    ↓
ZeroKey pays using your Hedera account keys
                    ↓
Payment verified on-chain — Mirror Node triple-check
                    ↓
Tool executes, findings returned to Claude (~3 seconds)
```

The payment is completely transparent to Claude. No 402 errors surface to the user.

## What this replaces

| Before | After |
|--------|-------|
| Register with each API provider | One MCP install |
| KYC, credit card, API key per service | HBAR testnet account |
| 15 `.env` keys to manage | 3 lines in MCP config |
| Agent blocked on new services | Agent pays and proceeds |

## Tools available

| Tool | What it does | Price |
|------|-------------|-------|
| `scan_code` | Static vulnerability analysis (Pyflakes + Bandit) | 0.5 HBAR |

## Audit trail

Every payment interaction is written to a dedicated HCS topic — sequenced, tamper-proof, publicly verifiable on Hashscan before you trust any result.

## The gap this closes

Today's AI agents cannot self-register for APIs — no KYC, no credit card. ZeroKey proxies premium tools behind an x402 paywall: any agent with an HBAR account can call any registered tool, paying fractions of a cent per use. When agent frameworks ship native wallet support (12–18 months), the local wrapper disappears — the server-side protocol is unchanged.

## Stack

- Python + Hedera Agent Kit v4
- MCP protocol (stdio transport)
- x402 payment protocol  
- Hedera testnet — Mirror Node + HCS + CryptoTransfer

## Project structure

```
mcp-server/     # FastAPI proxy + MCP server wrapper
  src/
    main.py       # FastAPI proxy (server-side)
    mcp_server.py # MCP stdio server (client-installable)
    x402.py       # 402 challenge / payment middleware
    receipt.py    # Mirror Node triple-check validation
    hcs.py        # Immutable audit trail writer
tests/          # End-to-end test client
client/         # Claude Desktop config + judge setup
DEMO.md         # Step-by-step demo walkthrough
```

## Judge setup (5 steps)

1. `cd mcp-server && pip install -r requirements.txt` — install dependencies
2. Copy `.env.example` to `.env` and fill in server account credentials (or ask the submitter for the shared testnet `.env`)
3. Start the proxy: `.venv/bin/python3.12 -m uvicorn src.main:app --port 8000`
4. Copy `client/claude_desktop_config.json` into `~/Library/Application Support/Claude/claude_desktop_config.json` — update the two path placeholders and your Hedera testnet credentials
5. Restart Claude Desktop → ask Claude: **"Scan this code for vulnerabilities: `import sqlite3; API_SECRET = 'abc123'`"**

Full walkthrough with expected outputs: see [DEMO.md](DEMO.md)

## Bounty

Entry for [Hedera AI Agent Bounty](https://ai-bounties.hedera.com) — Week 3: MCP or x402 Agent ($1,000 HBAR).  
Deadline: 21 June 2026, 23:59 UTC.
