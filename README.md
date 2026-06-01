# ZeroKey — MCP Tool Proxy with x402 Pay-Per-Use

MCP Server proxying premium dev tools — code analysis, OCR, weather — with zero API keys. Agents pay per-use in HBAR/USDC via Hedera x402. One connection replaces 15 API keys.

## How it works

1. Agent connects to the ZeroKey MCP Server and requests a tool (e.g. `secure_code_analysis`)
2. Server returns HTTP 402 Payment Required with the HBAR/USDC price
3. Agent uses Hedera Agent Kit to pass a partially signed transaction to the x402 facilitator
4. Once verified, the server executes the tool and returns the result

No API keys. No subscriptions. Pay per call, settled on Hedera.

## Stack

- Python + Hedera Agent Kit
- MCP protocol
- x402 payment protocol
- Hedera testnet (dev) / mainnet (submission)

## Project structure

```
src/          # MCP server + tool handlers
tests/        # Test scenarios
docs/         # Demo assets, submission writeup
```

## Bounty

Entry for [Hedera AI Agent Bounty](https://ai-bounties.hedera.com) — Week 3: MCP or x402 Agent ($1,000 HBAR).  
Deadline: 21 June 2026, 23:59 UTC.
