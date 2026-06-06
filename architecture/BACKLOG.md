# Hedera x402 MCP Proxy — Product Backlog

**Owner:** onAiR / Michael Emedo  
**Date:** 2026-06-02  
**Context:** Hedera Hackathon Week 3

---

## Desired Outcomes

These are the measurable success states. Every story must trace back to one of these.

| # | Outcome | How We Know It's Working |
|---|---|---|
| O1 | An AI agent can call a premium tool with zero pre-registered API keys | Agent sends blind request, pays via HBAR, receives tool output — end to end on testnet |
| O2 | Payments are verified on-chain — not trusted on the honour system | Mirror Node triple-check passes before any tool executes |
| O3 | Every payment interaction has a tamper-proof audit trail | HCS events visible and sequenced on Hashscan for every session |
| O4 | A downstream outage cannot trap agent funds | Refund dispatched within 5s of confirmed failure, HCS logged before and after |
| O5 | Iterative agent workloads run without per-call payment interruption | 10 back-to-back tool calls complete with zero 402 interrupts in allowance mode |
| O6 | API credentials are never reachable by any client | Code review + penetration test: no key in any response body or header |

---

## Epics

| ID | Epic | Outcome(s) | Priority |
|---|---|---|---|
| E1 | MCP Server Foundation | O1 | P0 |
| E2 | Core x402 Pay-Per-Call Rail | O1, O2 | P0 |
| E3 | Payment Receipt Validation | O2 | P0 |
| E4 | HCS Immutable Audit Trail | O3 | P1 |
| E5 | Graceful Failure & Auto-Refund | O4 | P1 |
| E6 | Session Allowance Mode | O5 | P2 |
| E7 | Secure Tool Registry | O1, O6 | P2 |
| E8 | Human-in-the-Loop Gate (Mainnet) | O1 | P3 |

---

## Epic E1 — MCP Server Foundation

> Everything else runs on this. No other epic starts until E1 is done.

### S1.1 — Runnable FastAPI + MCP Server

**As an** agent developer,  
**I want** a running MCP-compatible server endpoint,  
**So that** my agent can discover and call tools via the standard MCP protocol.

**Acceptance Criteria:**
- `POST /mcp/tools` returns a list of registered tools with names and descriptions
- Server starts cleanly with `uvicorn main:app` on port 8000
- Health check endpoint `GET /health` returns `{ "status": "ok" }`
- Server handles concurrent requests without blocking

**Out of scope:** Auth, payment, any specific tool implementation.

**Priority:** P0 — nothing works without this.

---

### S1.2 — Credential Vault (server-side .env)

**As a** tool provider,  
**I want** premium API keys loaded from server-side environment variables only,  
**So that** no client request can ever retrieve or infer a credential.

**Acceptance Criteria:**
- `.env` file loaded at startup via `python-dotenv`
- Keys accessible to tool handler functions internally
- No key appears in any HTTP response body, header, or log output
- Server fails fast at startup with a clear error if a required key is missing
- `.env` is in `.gitignore`

**Out of scope:** Key rotation, secrets manager integration (future).

**Priority:** P0 — security baseline before any tool is exposed.

---

### S1.3 — First Premium Tool: Static Code Analysis

**As an** agent developer,  
**I want** a working static code analysis tool registered on the server,  
**So that** I have a real end-to-end payable tool to demo and test against.

**Acceptance Criteria:**
- Tool name: `execute-static-analysis`
- Accepts: `{ "code": "<string>", "language": "<string>" }`
- Returns: analysis result payload from the upstream API
- Returns HTTP 400 with clear message if input is malformed
- Returns HTTP 503 (not 500) if upstream API is unreachable

**Out of scope:** Multiple tools (that's E7). This is one tool to validate the pattern.

**Priority:** P0 — needed for E2 demo.

---

## Epic E2 — Core x402 Pay-Per-Call Rail

> This is the product. The 402 challenge/response handshake is what makes the system work.

### S2.1 — x402 Middleware: Issue 402 Challenge

**As an** agent,  
**I want** to receive a structured HTTP 402 response when I call a tool without a payment receipt,  
**So that** I know exactly how much to pay, where to pay it, and how to track the transaction.

**Acceptance Criteria:**
- All `POST /mcp/tools/*` requests without `x402-Payment-Receipt` header receive `HTTP 402`
- Response includes exactly three headers:
  - `x402-Invoice-Account`: server's Hedera account ID (e.g. `0.0.XXXXXX`)
  - `x402-Invoice-Amount`: amount in HBAR to 8 decimal places (e.g. `0.50000000`)
  - `x402-Invoice-Reference`: a UUID v4 unique to this request
- UUID is generated fresh per request (not reused)
- UUID is held in server memory for the duration of the retry window
- Response body: `{ "error": "payment_required", "invoice": { ... } }`

**Out of scope:** Per-tool pricing (all tools same price at MVP). That's E7.

**Priority:** P0.

---

### S2.2 — Client: CryptoTransfer with UUID Memo

**As an** agent developer,  
**I want** the Hedera Agent Kit to construct and broadcast a CryptoTransfer with the invoice UUID in the memo field,  
**So that** the server can match the on-chain payment to the specific request.

**Acceptance Criteria:**
- Agent Kit called with: destination = server account, amount = invoice amount, memo = UUID
- Transaction broadcasts successfully to Hedera testnet
- Hedera Transaction ID returned to the agent for use in the retry
- If broadcast fails, error is surfaced clearly — agent does not silently retry

**Out of scope:** Gas estimation, mainnet. This story is testnet only.

**Priority:** P0.

---

### S2.3 — Server: Accept Retry with Payment Receipt and Execute Tool

**As an** agent,  
**I want** to retry my tool request with the payment receipt header and receive the tool result,  
**So that** the full pay-and-execute loop completes end to end.

**Acceptance Criteria:**
- `POST /mcp/tools/*` with valid `x402-Payment-Receipt` header routes to payment validation (E3)
- On validation pass: tool executes and result returned as `HTTP 200`
- On validation fail: `HTTP 402` re-issued (not 500)
- Receipt cannot be replayed: once a UUID is consumed, the same receipt returns `HTTP 402`
- Tool execution does not start until validation is confirmed

**Out of scope:** Allowance mode (E6), refunds (E5).

**Priority:** P0 — this closes the loop on the core mechanic.

---

## Epic E3 — Payment Receipt Validation

> Security-critical. Without this, anyone can fake a payment and get free tool access.

### S3.1 — Async Mirror Node Query

**As the** server,  
**I want** to query the Hedera Mirror Node asynchronously for a transaction ID,  
**So that** validation never blocks the event loop under concurrent agent load.

**Acceptance Criteria:**
- `validator.py` uses `asyncio` + `httpx` for all Mirror Node calls
- Query completes and returns result without blocking other in-flight requests
- Timeout after 10 seconds with `{ "error": "validation_timeout" }` — does not hang indefinitely
- Mirror Node URL is configurable via `.env` (supports testnet and mainnet endpoints)

**Out of scope:** Caching Mirror Node results (future optimisation).

**Priority:** P0.

---

### S3.2 — Triple-Check Receipt Validation

**As the** server,  
**I want** to validate three conditions on every payment receipt,  
**So that** no forged, redirected, or replayed transaction can unlock tool execution.

**Acceptance Criteria:**
- Check 1: `tx.status == "SUCCESS"` — transaction cleared on-chain
- Check 2: `tx.transfers[SERVER_ACCOUNT] == invoice_amount` — correct destination and exact amount
- Check 3: `tx.memo == invoice_uuid` — UUID matches the runtime invoice for this request
- All three checks must pass — partial pass returns `HTTP 402` not `HTTP 200`
- Failure reason is logged server-side (not exposed to client)
- Client receives `{ "error": "payment_invalid" }` on any failure — no check detail leaked

**Out of scope:** Partial amount acceptance, rounding tolerance.

**Priority:** P0 — this is the security gate.

---

## Epic E4 — HCS Immutable Audit Trail

> Hackathon rubric item. Also the trustless dispute resolution layer.

### S4.1 — HCS Topic Provisioned

**As a** tool provider,  
**I want** a dedicated HCS topic created for this server's audit log,  
**So that** all events write to a single, identifiable, publicly verifiable topic on Hashscan.

**Acceptance Criteria:**
- Topic created via Hedera Agent Kit `core_consensus_plugin`
- Topic ID stored in `.env` as `HCS_AUDIT_TOPIC_ID`
- Topic is readable on Hashscan (public, no submit key required for reads)
- Server fails to start if `HCS_AUDIT_TOPIC_ID` is not set

**Out of scope:** Topic access control, multiple topics per tool.

**Priority:** P1.

---

### S4.2 — Write Audit Events on Every State Transition

**As a** judge / auditor,  
**I want** every payment state transition written to HCS,  
**So that** I can verify the complete machine-to-machine interaction history on Hashscan without trusting either party.

**Acceptance Criteria:**
- Events written for: `402_issued`, `payment_verified`, `tool_executed`, `tool_failed`, `refund_sent`
- Each event includes: `event`, `uuid`, `tx_id` (where applicable), `tool`, `amount`, `timestamp`
- HCS write is fire-and-forget async — tool execution does not wait for HCS confirmation
- Write failure is logged server-side but does not fail the user-facing request
- Events are sequenced and visible on Hashscan within ~5 seconds

**Out of scope:** Querying HCS events via API (that's a future admin/dashboard feature).

**Priority:** P1.

---

## Epic E5 — Graceful Failure & Auto-Refund

> Financial integrity. Agent funds must not be trapped by upstream outages.

### S5.1 — Detect Downstream Failure Post-Payment

**As the** server,  
**I want** to detect when a proxied tool fails after payment has been verified,  
**So that** the refund hook can be triggered before the error response is returned.

**Acceptance Criteria:**
- Downstream failure defined as: HTTP 4xx/5xx from upstream API, or timeout after 15 seconds
- Detection fires only after `payment_verified` — not for pre-payment errors
- Failure type logged: `{ "type": "upstream_error" | "upstream_timeout", "status_code": N }`
- Does not trigger for malformed client input (that's a `400`, not a refund scenario)

**Priority:** P1.

---

### S5.2 — Async Refund via CryptoTransfer

**As an** agent,  
**I want** my HBAR automatically returned when the tool I paid for fails to execute,  
**So that** my agent's budget is not silently drained by upstream dependency outages.

**Acceptance Criteria:**
- Refund `CryptoTransfer` dispatched to agent wallet within 5 seconds of failure detection
- Refund amount = exact amount paid (no partial refunds)
- Refund dispatched asynchronously — does not block the HTTP 503 response
- HTTP 503 response body includes: `{ "error": "downstream_failure", "refund_status": "dispatched", "refund_tx_id": "..." }`
- If refund transfer itself fails: logged to HCS as `refund_failed`, server-side alert (not silently dropped)

**Out of scope:** Partial refunds, refund dispute UI.

**Priority:** P1.

---

### S5.3 — HCS Logged Before and After Refund

**As an** auditor,  
**I want** the failure and refund events written to HCS in sequence,  
**So that** there is a tamper-proof record that the refund was initiated before the error response was sent.

**Acceptance Criteria:**
- `tool_failed` HCS event written before refund is dispatched
- `refund_sent` HCS event written after refund Tx ID is known
- Both events reference the same `uuid` and original `tx_id`
- Sequence on Hashscan shows `tool_failed` before `refund_sent`

**Priority:** P1.

---

## Epic E6 — Session Allowance Mode

> Differentiator. Eliminates 2–4s per-call latency for iterative agent loops.

### S6.1 — Server Detects Allowance Header

**As an** agent,  
**I want** to signal that I have pre-approved an HBAR allowance,  
**So that** the server skips the 402 challenge and pulls payment directly from my allowance.

**Acceptance Criteria:**
- `x-allowance: true` request header triggers allowance path
- Server verifies allowance exists and is sufficient before calling the tool
- If allowance is insufficient: returns `HTTP 402` with message `"allowance_insufficient"` — not a generic 402
- If `x-allowance: true` but no allowance approved: returns `HTTP 402` with `"allowance_not_found"`

**Out of scope:** Allowance creation via the server — agent manages its own allowance via Agent Kit.

**Priority:** P2.

---

### S6.2 — Server Pulls Payment via Allowance Tool

**As the** server,  
**I want** to pull the tool payment from the agent's pre-approved allowance,  
**So that** the tool executes without interrupting the agent's LLM loop.

**Acceptance Criteria:**
- `TRANSFER_HBAR_WITH_ALLOWANCE_TOOL` called server-side for allowance-mode requests
- Payment pulled before tool execution begins
- HCS `payment_verified` event written (same schema as Mode A)
- Transfer completes in < 2 seconds (allowance pulls have no facilitator round-trip)
- Tool executes only after allowance pull is confirmed

**Priority:** P2.

---

## Epic E7 — Secure Tool Registry

> Allows the proxy to offer multiple tools without each needing custom server code.

### S7.1 — Config-Driven Tool Registration

**As a** tool provider,  
**I want** to register a new tool by adding config rather than writing server code,  
**So that** the proxy can be extended without a deployment per tool.

**Acceptance Criteria:**
- Tools defined in `tools.yaml` or equivalent config: `name`, `description`, `price_hbar`, `upstream_url`, `env_key`
- Server loads tool registry at startup
- Adding a new tool to config and restarting makes it immediately discoverable via MCP
- Removing a tool from config makes it return `404` — not a crash

**Out of scope:** Hot-reload (config changes require restart at MVP).

**Priority:** P2.

---

### S7.2 — OCR Extraction Tool

**As an** agent developer,  
**I want** a second registered tool (OCR extraction),  
**So that** the demo shows the proxy as a multi-tool platform, not a single-purpose server.

**Acceptance Criteria:**
- Tool name: `ocr-extract`
- Accepts: `{ "file_url": "<string>", "output_format": "text" | "structured" }`
- Returns extracted text or structured data from upstream OCR API
- Uses a different `.env` credential than the code analysis tool
- Has its own pricing entry in `tools.yaml`

**Priority:** P2.

---

### S7.3 — Per-Invoice Price Validation in Refund Path *(Sprint 8 — MANDATORY FIX)*

**As a** developer using a multi-priced tool,  
**I want** the refund calculation to use the price I was actually charged,  
**So that** a failed tool call triggers the correct refund amount regardless of which tool I called.

**Acceptance Criteria:**
- `price_hbar` field in tool config drives the `x402-Invoice-Amount` value
- Invoice amount reflects the specific tool being called — not a flat server-wide rate
- `receipt.py:51` reads `pending_entry["amount_hbar"]` — not `settings["TOOL_PRICE_HBAR"]`
- `TOOL_PRICE_HBAR` retired from `config.py` REQUIRED_KEYS and all 5 reference sites (`config.py:12`, `x402.py:118`, `x402.py:170`, `x402.py:183`, `x402.py:193`)
- Tool at 0.5 HBAR and tool at 2 HBAR each trigger refunds at their own price — not a global default
- Existing refund flow (HCS `tool_failed` before refund dispatched) is unchanged
- All tests pass; refund scenario uses invoice amount, not the env var

**Out of scope:** Dynamic pricing, time-based pricing, discount logic.

**Priority:** P0 — mathematical bug in the refund path. Breaks multi-tool demos.

---

### S7.4 — Non-Blocking Tool Execution (Thread Pool) *(Sprint 8 — Judge Feedback)*

**As a** developer using the x402 proxy,  
**I want** the server to handle multiple concurrent tool calls without stalling,  
**So that** my agent is not blocked by another user's slow code-scan running on the same server.

**Acceptance Criteria:**
- Blocking code-analysis scan runs via `asyncio.run_in_executor` (thread pool) — not inline on the event loop
- While a code-scan is in progress, a second concurrent request begins processing immediately — no queue stall
- Thread pool is bounded (default `ThreadPoolExecutor` or explicit limit) — unbounded threads not acceptable
- Response time for non-blocking endpoints (e.g. `/health`, 402 challenge) is unaffected while a scan is running
- All existing tests pass; no change to tool response schema

**Out of scope:** Worker queues, job IDs, webhook callbacks, rate limiting per account.

**Priority:** P0 — blocking event loop causes full server stall under concurrent load. Disqualifying under stress.

---

### S7.5 — Mirror Node-Backed Replay Protection *(Sprint 8 — Judge Feedback)*

**As a** tool provider,  
**I want** receipt replay detection to survive server restarts,  
**So that** a bad actor cannot reuse an old payment receipt after the server reboots to get free tool calls.

**Acceptance Criteria:**
- In-memory `used_invoices` set removed as sole replay guard
- On every receipt validation, Mirror Node queried for prior confirmed transactions whose memo matches the invoice UUID
- If Mirror Node returns ≥1 confirmed tx with that UUID memo (not the current tx), receipt rejected with `402 / duplicate_invoice`
- If Mirror Node query fails (timeout/5xx), system fails closed — receipt rejected, not accepted
- Server restart followed by resubmission of an already-used receipt is rejected correctly
- Mirror Node query is async (`httpx` async client) — does not block the event loop
- Existing triple-check (tx.status + destination + UUID memo) is preserved — this is an additional check

**Out of scope:** Persistent local cache, database, Redis — ledger is the source of truth.

**Priority:** P0 — replay attack trivially demonstrable after server restart. Kills the "trustless" claim at the centre of the pitch.

**Open Question:** Mirror Node query latency on testnet — if p95 > 3s, use 3s timeout + fail-closed and document the tradeoff.

---

## Epic E8 — Human-in-the-Loop Gate (Mainnet)

> Required for mainnet safety. Testnet can run fully autonomous.

### S8.1 — Mainnet Authorization Prompt

**As a** developer running an agent on mainnet,  
**I want** my agent to pause and ask me to confirm before broadcasting a real HBAR payment,  
**So that** I cannot accidentally spend real funds due to a misconfigured agent loop.

**Acceptance Criteria:**
- When `HEDERA_NETWORK=mainnet`, Agent Kit outputs: `"Tool execution requires 0.5 HBAR. Authorize? (y/n)"`
- Agent loop pauses until explicit `y` input
- `n` input cancels the request cleanly — no partial transaction broadcast
- On testnet (`HEDERA_NETWORK=testnet`): gate is bypassed automatically — no prompt

**Out of scope:** GUI approval UI, mobile push approval.

**Priority:** P3 — testnet demo does not require this.

---

## Prioritised Backlog

Full ordered list. Top = implement first.

| # | Story | Epic | Priority | Blocks |
|---|---|---|---|---|
| 1 | S1.1 — Runnable FastAPI + MCP Server | E1 | P0 | Everything |
| 2 | S1.2 — Credential Vault | E1 | P0 | S1.3, all tools |
| 3 | S1.3 — First Tool: Static Code Analysis | E1 | P0 | S2.3 |
| 4 | S2.1 — x402 Middleware: Issue 402 Challenge | E2 | P0 | S2.3 |
| 5 | S3.1 — Async Mirror Node Query | E3 | P0 | S3.2 |
| 6 | S3.2 — Triple-Check Receipt Validation | E3 | P0 | S2.3 |
| 7 | S2.2 — Client: CryptoTransfer with UUID Memo | E2 | P0 | S2.3 |
| 8 | S2.3 — Accept Retry + Execute Tool | E2 | P0 | Full demo |
| 9 | S4.1 — HCS Topic Provisioned | E4 | P1 | S4.2 |
| 10 | S4.2 — Write Audit Events on State Transitions | E4 | P1 | S5.3 |
| 11 | S5.1 — Detect Downstream Failure Post-Payment | E5 | P1 | S5.2 |
| 12 | S5.2 — Async Refund via CryptoTransfer | E5 | P1 | S5.3 |
| 13 | S5.3 — HCS Logged Before and After Refund | E5 | P1 | — |
| 14 | S6.1 — Server Detects Allowance Header | E6 | P2 | S6.2 |
| 15 | S6.2 — Server Pulls Payment via Allowance Tool | E6 | P2 | — |
| 16 | S7.1 — Config-Driven Tool Registration | E7 | P2 | S7.2, S7.3 |
| 17 | S7.3 — Per-Invoice Price Validation (Refund Fix) | E7 | P0 | — |
| 18 | S7.4 — Non-Blocking Tool Execution (Thread Pool) | E7 | P0 | — |
| 19 | S7.5 — Mirror Node-Backed Replay Protection | E7 | P0 | — |
| 20 | S7.2 — OCR Extraction Tool | E7 | P2 | — |
| 21 | S8.1 — Mainnet Authorization Prompt | E8 | P3 | — |

---

## MVP Definition

To demo a working system at the hackathon, stories 1–8 are required (all P0).  
Stories 9–13 (HCS + Refund) are strongly recommended — they directly address judging rubric items.  
Stories 14–18 are differentiators for a standout submission.  
Story 19 is post-hackathon / mainnet only.

**MVP = Stories 1–13. Target: runnable on testnet with Hashscan-verifiable audit trail.**

---

## Epic E10 — MCP Client Wrapper & Installable Demo

> Turns the project from a server-side proxy into something a developer installs in 60 seconds. This is the demo. Without it, judges have to run a manual shim to experience the value prop.

### S10.1 — MCP Server Entry Point

**As a** developer,  
**I want** to install ZeroKey as an MCP server in Claude Desktop,  
**So that** my coding agent can discover and call its tools without any additional tooling.

**Acceptance Criteria:**
- `mcp-server/src/mcp_server.py` is a valid MCP stdio server using the Python MCP SDK
- Server registers `scan_code` and returns it in the MCP tool-list response
- Running `python -m mcp_server` from `mcp-server/` starts the server without error
- MCP server calls the FastAPI proxy over HTTP (localhost) — it is a wrapper, not a rewrite
- Existing `main.py` FastAPI proxy is untouched — both run independently

**Out of scope:** Replacing or merging the FastAPI server. Cursor or other agent hosts.

**Priority:** P1 — nothing in Sprint 9 works without this.

---

### S10.2 — `scan_code` Tool with Embedded x402 Payment Flow

**As a** coding agent (Claude),  
**I want** to call `scan_code` with a code snippet,  
**So that** I receive vulnerability findings without a visible payment step or API key.

**Acceptance Criteria:**
- MCP tool `scan_code` accepts `{ "code": str, "language": str }` input
- On invocation: MCP server sends request to FastAPI proxy
- If 402 received: MCP server extracts invoice metadata, submits HBAR payment using local Hedera Agent Kit, retries with receipt — transparently, no 402 visible to Claude
- If payment succeeds: returns structured findings JSON to Claude
- If payment fails: returns `{ "error": "payment_failed", "reason": "..." }` — does not hang
- If proxy unreachable: returns `{ "error": "proxy_unavailable" }` within 5 seconds
- Claude Desktop displays findings inline — no raw JSON exposed

**Out of scope:** Additional tools (OCR etc.) in this sprint. `scan_code` only.

**Priority:** P1 — this is the demo.

---

### S10.3 — Wallet Configuration via MCP Server Config

**As a** developer,  
**I want** to configure my HBAR keys once in the MCP config block,  
**So that** payment happens automatically on every tool call with no separate wallet setup.

**Acceptance Criteria:**
- MCP server reads `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, `HEDERA_NETWORK` from environment (passed via Claude Desktop MCP config `env` block)
- Server refuses to start and logs a clear error if any required key is missing
- Keys are never echoed in tool responses, MCP metadata, or log output
- Developer requires no separate `.env` file — the MCP config block is the single source

**Out of scope:** Key rotation, multi-account, passkey-backed wallets.

**Priority:** P1 — no separate shim required is the whole point.

---

### S10.4 — Claude Desktop Installation Config

**As a** hackathon judge,  
**I want** a single config block I can paste into Claude Desktop,  
**So that** the MCP server is installed and the demo is ready in under 2 minutes.

**Acceptance Criteria:**
- `client/claude_desktop_config.json` exists with a working MCP server entry (command, args, env placeholders)
- README "Judge Setup" section covers: clone → populate 3 env values → paste config → restart Claude Desktop → done (5 steps max)
- Config has been manually verified to work on a clean Claude Desktop install before submission
- Judges need zero knowledge of the Python MCP SDK to run the demo

**Out of scope:** Cursor, Copilot, or any other agent host. Claude Desktop only.

**Priority:** P1 — judges cannot run the demo without this.

---

### S10.5 — End-to-End Demo Script (DEMO.md)

**As a** judge evaluating the submission,  
**I want** a scripted demo walkthrough with expected outputs,  
**So that** I can verify the system works and understand what I am seeing at each step.

**Acceptance Criteria:**
- `DEMO.md` at repo root includes the exact Claude prompt to trigger the flow
- Expected output documented: what Claude says, approximate wait time (2–3s for chain), what findings look like
- On-chain verification step included: judge navigates to Hashscan HCS topic to see the audit trail
- Demo uses a committed dummy file `demo/vulnerable_code.py` — not the judge's own code
- Hashscan link to the live HCS audit topic is embedded in `DEMO.md`

**Out of scope:** Video recording, slide deck.

**Priority:** P1 — without this, the magic is invisible.

---

## Sprint 8 — Product Hardening

Three P0 fixes. Must be complete before Sprint 9 starts.

| Story | Title | Fix |
|---|---|---|
| S7.3 | Per-Invoice Price Validation (Refund Fix) | receipt.py:51 reads wrong price index — reads global env var instead of invoice-specific amount |
| S7.4 | Non-Blocking Tool Execution | Code-scan blocks event loop — fix with asyncio.run_in_executor thread pool |
| S7.5 | Mirror Node-Backed Replay Protection | In-memory replay guard lost on server restart — fix with Mirror Node UUID query |

## Sprint 9 — MCP Client Wrapper & Installable Demo

Five P1 stories. The demo that proves the thesis.

| Story | Title | What |
|---|---|---|
| S10.1 | MCP Server Entry Point | `mcp_server.py` — valid stdio MCP server wrapping the FastAPI proxy |
| S10.2 | `scan_code` Tool with x402 Flow | Payment handled inside MCP tool handler — transparent to Claude |
| S10.3 | Wallet Config via MCP Config Block | HBAR keys from Claude Desktop `env` — no separate shim |
| S10.4 | Claude Desktop Installation Config | `client/claude_desktop_config.json` + judge README section |
| S10.5 | End-to-End Demo Script | `DEMO.md` — exact prompts, expected output, Hashscan links |
