# Zero API Key Dev-Tool Proxy — Architecture Document

**Project:** Hedera x402 MCP Proxy Server  
**Track:** Hedera Hackathon — Week 3  
**Date:** 2026-06-02  
**Author:** onAiR / Michael Emedo

---

## 1. Problem Statement

Every internet payment flow today assumes a human is present. AI agents are structurally locked out:

| Human Flow | Agent Failure |
|---|---|
| Visit website | Agent cannot browse |
| Create account + KYC | Agent has no identity |
| Enter credit card | Agent has no payment method |
| Copy API key to `.env` | Agent cannot self-register |

**Result:** Developers must hardcode 15+ API keys per project. Agents can only call APIs their human creators pre-funded.

**This system solves that.** It builds the infrastructure rail for a **Zero-Account, Machine-to-Machine Economy** — where any Hedera-powered AI agent can hit an arbitrary API endpoint, handle an HTTP 402 autonomously, and pay fractions of a cent per-use in HBAR or USDC with no human in the loop.

---

## 2. System Topology

Three independent domains. Each owns a distinct responsibility.

```
┌─────────────────────────────────────────────────────────────────────┐
│  DOMAIN 1: CLIENT ENVIRONMENT                                       │
│                                                                     │
│   ┌──────────────────┐     (1) POST /mcp/tools/execute-*           │
│   │  LLM Agent Loop  │ ──────────────────────────────────────────► │
│   │  (LangChain etc) │ ◄────────────────────────────────────────── │
│   └──────────────────┘     (2) HTTP 402 + Invoice Headers          │
│            │                                                        │
│            │ (5) Retry with x402-Payment-Receipt header            │
│            │                                                        │
│   ┌──────────────────┐     (3) Construct + Sign CryptoTransfer     │
│   │  Hedera Agent    │ ──────────────────────────────────────────► │
│   │  Kit (Python)    │                                             │
│   └──────────────────┘                                             │
└─────────────────────────────────────────────────────────────────────┘
                    │                         │
              (5) Retry                  (3b) Broadcast
                    │                         │
                    ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DOMAIN 2: PROXY MCP SERVER (FastAPI + Python MCP SDK)             │
│                                                                     │
│   ┌──────────────────────────────┐   (Webhook/Poll)                │
│   │  x402 Middleware             │ ◄────────────────────────────── │
│   │  · Throw 402 Challenge       │                                 │
│   │  · Generate Invoice UUID     │   ┌─────────────────────────┐  │
│   │  · Verify Tx Receipt (async) │   │  Mirror Node Listener   │  │
│   └──────────────────┬───────────┘   │  (asyncio + httpx)      │  │
│                      │               └─────────────────────────┘  │
│             [Payment Verified = True]                              │
│                      │                                             │
│                      ▼                                             │
│   ┌──────────────────────────────┐   (6) Call Premium API         │
│   │  Secure Tool Registry        │ ──────────────────────────────►│
│   │  · code_analysis             │                                │
│   │  · ocr_extraction            │   ┌─────────────────────────┐  │
│   │  · database_query            │   │  API Credential Vault   │  │
│   └──────────────────────────────┘   │  (server-side .env)     │  │
│                                      └─────────────────────────┘  │
│                                                                     │
│   ┌──────────────────────────────┐                                 │
│   │  HCS Audit Logger            │ ── writes every 402 + verify   │
│   │  (core_consensus_plugin)     │    to immutable on-chain topic  │
│   └──────────────────────────────┘                                 │
│                                                                     │
│   ┌──────────────────────────────┐                                 │
│   │  Refund Hook (async)         │ ── triggers on downstream fail  │
│   │  · Reverse CryptoTransfer    │    returns HBAR to agent wallet │
│   └──────────────────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DOMAIN 3: HEDERA LEDGER                                            │
│                                                                     │
│   ┌──────────────────────┐        ┌──────────────────────────┐     │
│   │  x402 Facilitator    │ ─────► │  Hedera Consensus Node   │     │
│   │  (Gas Sponsor Node)  │        │  (Mainnet / Testnet)     │     │
│   └──────────────────────┘        └──────────────────────────┘     │
│                                            │                        │
│                                   ┌────────▼─────────────────┐     │
│                                   │  Hedera Mirror Node      │     │
│                                   │  (tx verification index) │     │
│                                   └──────────────────────────┘     │
│                                            │                        │
│                                   ┌────────▼─────────────────┐     │
│                                   │  HCS Topic               │     │
│                                   │  (immutable audit log)   │     │
│                                   └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Payment Modes

The server supports two distinct payment paths. Clients choose based on workload pattern.

### Mode A — Pay-Per-Call (x402 Exact Payment)

Best for: single or infrequent tool calls.

```
Agent                   MCP Server              Hedera
  │                          │                     │
  │── POST /mcp/tools/* ────►│                     │
  │                          │ (no receipt header) │
  │◄── 402 + Invoice ────────│                     │
  │    x402-Invoice-Account  │                     │
  │    x402-Invoice-Amount   │                     │
  │    x402-Invoice-Ref UUID │                     │
  │                          │                     │
  │── CryptoTransfer ────────────────────────────►│
  │    memo = Invoice UUID   │                     │
  │                          │◄── tx confirmed ────│
  │                          │    Mirror Node poll │
  │                          │── HCS log write ───►│
  │                          │                     │
  │── POST /mcp/tools/* ────►│                     │
  │    x402-Payment-Receipt  │                     │
  │    = Hedera Tx ID        │                     │
  │                          │ verify: dest acct ✓ │
  │                          │ verify: amount ✓    │
  │                          │ verify: UUID memo ✓ │
  │                          │                     │
  │                          │── call premium API ►│
  │◄── HTTP 200 + payload ───│                     │
```

### Mode B — Session Allowance (HBAR Token Allowance)

Best for: iterative loops (e.g., analysing 10 files back-to-back). Eliminates per-call latency.

```
Agent                   MCP Server              Hedera
  │                          │                     │
  │── APPROVE_HBAR_ALLOWANCE ───────────────────►  │
  │    amount = 20 HBAR      │                     │
  │    spender = server acct │                     │
  │                          │                     │
  │── POST /mcp/tools/* ────►│                     │
  │    x-allowance: true     │                     │
  │                          │── TRANSFER_WITH ───►│
  │                          │   ALLOWANCE_TOOL    │
  │                          │   (no client pause) │
  │                          │── HCS log write ───►│
  │                          │                     │
  │                          │── call premium API ►│
  │◄── HTTP 200 + payload ───│                     │
  │                          │                     │
  │  [repeat with no 402     │                     │
  │   interruption until     │                     │
  │   allowance exhausted]   │                     │
```

---

## 4. Step-by-Step Execution Flow (Mode A — Full x402)

| Step | Actor | Action |
|---|---|---|
| 1 | Agent | Sends blind `POST /mcp/tools/execute-static-analysis` — no auth headers |
| 2 | x402 Middleware | Intercepts. No receipt found. Returns `402` with `x402-Invoice-Account`, `x402-Invoice-Amount`, `x402-Invoice-Reference` (UUID) |
| 3 | Agent Kit | Constructs `CryptoTransferTransaction`. Appends UUID to memo field. On mainnet: prompts human `"Authorize 0.5 HBAR? (y/n)"` |
| 4 | Facilitator | Validates destination + amount match invoice rules. Sponsors gas. Broadcasts to Hedera Consensus Node |
| 5 | Agent | Retries `POST /mcp/tools/*` with `x402-Payment-Receipt: <Hedera Tx ID>` |
| 6 | validator.py | Queries Mirror Node. Checks: (a) tx SUCCESS, (b) dest account = server, (c) memo UUID matches runtime invoice |
| 7 | MCP Server | Unlocks `.env` vault. Routes to premium backend service |
| 8 | MCP Server | Writes HCS audit entry: `{ event: "tool_executed", uuid, tx_id, timestamp }` |
| 9 | Agent | Receives `HTTP 200 OK` with tool payload |

---

## 5. Failure & Refund Flow

Triggered when: premium downstream API (OCR engine, code scanner) fails or times out after payment has been verified.

```
Agent                   MCP Server              Hedera
  │                          │                     │
  │  [payment verified ✓]    │                     │
  │                          │── call premium API ►│
  │                          │◄── 503 Timeout ─────│
  │                          │                     │
  │                          │── HCS log write ────►
  │                          │   event: tool_fail  │
  │                          │                     │
  │                          │── async refund ─────►
  │                          │   CryptoTransfer    │
  │                          │   to agent wallet   │
  │                          │── HCS log write ────►
  │                          │   event: refund_sent│
  │                          │                     │
  │◄── HTTP 503 + refund_ref─│                     │
      "Refund dispatched:     │                     │
       Hedera Tx ID XXXXX"
```

---

## 6. Component Inventory

| Component | Tech | Responsibility |
|---|---|---|
| MCP Server | FastAPI + Python MCP SDK | Tool routing, 402 lifecycle, credential vault access |
| x402 Middleware | Python (FastAPI middleware) | Intercept all tool requests, issue/validate invoices |
| validator.py | asyncio + httpx | Query Mirror Node, verify tx receipt headers |
| Secure Tool Registry | Python | Map tool names to premium backend API calls |
| API Credential Vault | Server-side `.env` | Store all premium API keys — never exposed to clients |
| HCS Audit Logger | Hedera Agent Kit `core_consensus_plugin` | Write immutable state events to HCS topic |
| Refund Hook | Async Python | Reverse-transfer HBAR to agent wallet on downstream failure |
| Hedera Agent Kit | Python SDK (v4) | Client-side: sign/broadcast transactions, manage allowances |
| x402 Facilitator | Hedera network node | Gas sponsorship, transaction broadcasting |
| Mirror Node Listener | Hedera Mirror Node REST API | Transaction confirmation queries |
| HCS Topic | Hedera Consensus Service | Permanent tamper-proof audit log |

---

## 7. Data Contracts

### 402 Challenge Response Headers

```
HTTP/1.1 402 Payment Required
x402-Invoice-Account:    0.0.XXXXXX          # Server's Hedera account ID
x402-Invoice-Amount:     0.50000000          # Amount in HBAR (8 decimal places)
x402-Invoice-Reference:  uuid-v4-string      # Unique per-request tracking UUID
```

### Payment Receipt Request Header (Client Retry)

```
x402-Payment-Receipt:    0.0.XXXXXX@NNNNNNN-XXXXXXXXXX  # Hedera Tx ID
```

### Mirror Node Validation Checks

```python
assert tx.status == "SUCCESS"
assert tx.transfers[server_account] == invoice_amount
assert tx.memo == invoice_uuid
```

### HCS Audit Message Schema

```json
{
  "event":     "402_issued | payment_verified | tool_executed | tool_failed | refund_sent",
  "uuid":      "invoice-reference-uuid",
  "tx_id":     "hedera-transaction-id",
  "tool":      "tool_name",
  "amount":    "0.50000000",
  "timestamp": "ISO-8601"
}
```

---

## 8. Key Design Decisions

| Decision | Rationale |
|---|---|
| **Stateless, no database** | Hedera ledger is the source of truth. UUID in tx memo eliminates need to persist invoice state. Infinitely scalable. |
| **asyncio + httpx for Mirror Node** | Mirror Node queries run async — zero blocking in the LLM execution chain. |
| **HCS for audit trail** | Trustless dispute resolution. Neither server nor agent can retroactively alter the log. Judges can verify live on Hashscan. |
| **Allowance mode for iterative loops** | Per-call 402 round-trips add ~2–4s latency each. Allowance mode drops this to sub-100ms for sustained agent workloads. |
| **Server-side `.env` vault** | API keys never leave the server. Clients receive only tool outputs. Eliminates credential exfiltration surface. |
| **Facilitator gas sponsorship** | Agent never needs to hold HBAR specifically for gas — only for the tool payment itself. Removes a friction point for onboarding. |
| **Refund hook on downstream failure** | Agent funds cannot be trapped. Production-readiness signal. Guards against upstream dependency outages silently consuming agent budgets. |

---

## 9. Hedera Services Used

| Service | Usage | Hackathon Rubric |
|---|---|---|
| **Hedera Consensus Service (HCS)** | Immutable audit log of every 402 event and payment | Native Hedera service integration |
| **Hedera Token Service (HTS)** | USDC token transfers (alternative to HBAR) | Native Hedera service integration |
| **x402 Facilitator** | Gas sponsorship + tx broadcasting | x402 payment protocol |
| **CryptoTransfer** | HBAR payment from agent to server | Core ledger mechanic |
| **HBAR Token Allowance** | Pre-approved session budget for iterative loops | Advanced ledger mechanic |
| **Mirror Node** | Tx receipt validation (async) | Off-ledger query layer |
| **Hedera Agent Kit v4** | Client-side tx construction, allowance tools, HCS writes | Official Hedera agent tooling |

---

## 10. Security Boundaries

```
┌─────────────────────┐
│  PUBLIC SURFACE     │  POST /mcp/tools/*
│  (Agent-facing)     │  Only receives: tool name + payment receipt header
└──────────┬──────────┘
           │ x402 Middleware gates all traffic
┌──────────▼──────────┐
│  INTERNAL SURFACE   │  Premium API calls
│  (Server-side only) │  .env credential vault
│                     │  Refund initiation
└─────────────────────┘
```

- Clients **never** see API keys — they only receive tool output.
- Payment receipt validation is triple-checked: tx status + destination account + UUID memo.
- All financial operations (refunds, allowance pulls) are logged to HCS before execution.
- No user state stored server-side — zero PII surface.
