import { useState } from 'react';

const NAV = [
  { id: 'overview',    label: '01  Overview',          icon: '◈' },
  { id: 'topology',    label: '02  System Topology',   icon: '◈' },
  { id: 'modes',       label: '03  Payment Modes',     icon: '◈' },
  { id: 'flow',        label: '04  Execution Flow',    icon: '◈' },
  { id: 'refund',      label: '05  Failure & Refund',  icon: '◈' },
  { id: 'components',  label: '06  Components',        icon: '◈' },
  { id: 'contracts',   label: '07  Data Contracts',    icon: '◈' },
  { id: 'decisions',   label: '08  Design Decisions',  icon: '◈' },
  { id: 'hedera',      label: '09  Hedera Services',   icon: '◈' },
  { id: 'security',    label: '10  Security',          icon: '◈' },
];

const COLORS = {
  bg:       '#0a0f1e',
  sidebar:  '#0d1526',
  card:     '#111827',
  border:   '#1e2d45',
  active:   '#0ea5e9',
  activeB:  '#0c2a3d',
  text:     '#e2e8f0',
  muted:    '#64748b',
  cyan:     '#38bdf8',
  green:    '#10b981',
  amber:    '#f59e0b',
  purple:   '#a855f7',
  red:      '#ef4444',
  indigo:   '#6366f1',
};

const s = {
  h2: { fontSize: 22, fontWeight: 700, color: COLORS.cyan, marginBottom: 6, fontFamily: 'monospace' },
  h3: { fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 10, marginTop: 24, fontFamily: 'monospace', letterSpacing: '0.05em', textTransform: 'uppercase' },
  p:  { fontSize: 14, color: '#94a3b8', lineHeight: 1.75, marginBottom: 12 },
  code: {
    display: 'block', backgroundColor: '#020817', border: `1px solid ${COLORS.border}`,
    borderRadius: 8, padding: '16px 20px', fontFamily: 'monospace', fontSize: 12,
    color: '#e2e8f0', lineHeight: 1.7, overflowX: 'auto', marginBottom: 16,
    whiteSpace: 'pre',
  },
  inlineCode: {
    backgroundColor: '#1e2d45', color: COLORS.cyan, padding: '2px 6px',
    borderRadius: 4, fontFamily: 'monospace', fontSize: 12,
  },
  tag: (color) => ({
    display: 'inline-block', backgroundColor: color + '22', color,
    padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
    fontFamily: 'monospace', letterSpacing: '0.03em',
  }),
  pill: {
    display: 'inline-block', backgroundColor: COLORS.activeB, color: COLORS.active,
    padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
    fontFamily: 'monospace', marginRight: 6, marginBottom: 6,
  },
};

function Card({ children, style }) {
  return (
    <div style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '20px 24px', marginBottom: 16, ...style }}>
      {children}
    </div>
  );
}

function Table({ headers, rows, colColors }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ textAlign: 'left', padding: '8px 14px', color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}`, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: `1px solid ${COLORS.border}22` }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '10px 14px', color: colColors?.[ci] ?? COLORS.text, verticalAlign: 'top', lineHeight: 1.5 }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ label, color }) {
  return <span style={s.tag(color ?? COLORS.cyan)}>{label}</span>;
}

function FlowStep({ num, actor, action, highlight }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
      <div style={{ minWidth: 28, height: 28, borderRadius: '50%', backgroundColor: highlight ? COLORS.active : COLORS.border, color: highlight ? '#fff' : COLORS.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{num}</div>
      <div style={{ flex: 1 }}>
        <span style={{ color: COLORS.cyan, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{actor}</span>
        <span style={{ color: '#94a3b8', fontSize: 13, marginLeft: 8 }}>{action}</span>
      </div>
    </div>
  );
}

// ─── SECTIONS ──────────────────────────────────────────────────────────────────

function Overview() {
  return (
    <div>
      <h2 style={s.h2}>Zero API Key Dev-Tool Proxy</h2>
      <p style={{ ...s.p, fontSize: 15, color: COLORS.text }}>
        Infrastructure rail for a <strong style={{ color: COLORS.cyan }}>Zero-Account, Machine-to-Machine Economy</strong> — enabling any Hedera-powered AI agent to call premium API tools autonomously, pay per-use in HBAR or USDC, with no human, no signup, and no pre-funded API keys.
      </p>

      <h3 style={s.h3}>The Problem</h3>
      <Card>
        <Table
          headers={['Today — Human Flow', 'Agent Failure']}
          rows={[
            ['Visit website & create account', 'Agent cannot browse or register'],
            ['Pass KYC / identity check', 'Agent has no identity'],
            ['Enter credit card', 'Agent has no payment method'],
            ['Copy API key to .env', 'Agent cannot self-register'],
            ['Pre-purchase credit packages', 'Agent cannot pre-fund'],
          ]}
          colColors={[COLORS.text, COLORS.red]}
        />
      </Card>

      <Card style={{ borderColor: COLORS.active + '44', backgroundColor: '#0c1f30' }}>
        <p style={{ ...s.p, margin: 0, color: COLORS.text }}>
          Developers today must hardcode <strong style={{ color: COLORS.amber }}>15+ API keys</strong> per project. Agents can only use APIs their human creators pre-registered and pre-funded. This system eliminates that dependency entirely.
        </p>
      </Card>

      <h3 style={s.h3}>What This Builds</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[
          { title: 'MCP Proxy Server', desc: 'Acts as payment gateway + credential vault for premium dev tools', color: COLORS.cyan },
          { title: 'x402 Payment Rail', desc: 'HTTP 402 challenge/response cycle with Hedera HBAR micro-settlement', color: COLORS.green },
          { title: 'Immutable Audit Log', desc: 'Every payment event written to Hedera Consensus Service (HCS)', color: COLORS.purple },
        ].map(({ title, desc, color }) => (
          <Card key={title} style={{ borderColor: color + '33' }}>
            <div style={{ color, fontWeight: 700, fontSize: 13, fontFamily: 'monospace', marginBottom: 6 }}>{title}</div>
            <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.6 }}>{desc}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Topology() {
  return (
    <div>
      <h2 style={s.h2}>System Topology</h2>
      <p style={s.p}>Three independent domains. Each owns a distinct responsibility. No domain can bypass another.</p>

      {[
        {
          num: '01', title: 'Client Environment', color: COLORS.cyan,
          items: ['Primary LLM Agent Loop (LangChain / custom)', 'Hedera Agent Kit v4 (Python) — tx signing, allowance tools', 'Sends blind tool requests → catches 402 → retries with receipt'],
        },
        {
          num: '02', title: 'Proxy MCP Server', color: COLORS.green,
          items: ['FastAPI + Python MCP SDK', 'x402 Middleware — issues challenges, validates receipts', 'Secure Tool Registry — code analysis, OCR, DB queries', 'API Credential Vault (server-side .env — never exposed)', 'HCS Audit Logger — writes every event on-chain', 'Async Refund Hook — reverses payment on downstream failure'],
        },
        {
          num: '03', title: 'Hedera Ledger', color: COLORS.purple,
          items: ['x402 Facilitator — gas sponsorship + tx broadcasting', 'Hedera Consensus Node — mainnet / testnet settlement', 'Mirror Node — async transaction verification', 'HCS Topic — permanent tamper-proof audit log'],
        },
      ].map(({ num, title, color, items }) => (
        <Card key={num} style={{ borderLeft: `4px solid ${color}`, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ color, fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>DOMAIN {num}</span>
            <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 15 }}>{title}</span>
          </div>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
              <span style={{ color, marginTop: 2, flexShrink: 0 }}>›</span>
              <span style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </Card>
      ))}

      <h3 style={s.h3}>Message Flow Diagram</h3>
      <pre style={s.code}>{`CLIENT                    MCP SERVER                  HEDERA
  │                            │                           │
  │── POST /mcp/tools/* ──────►│                           │
  │   (no auth headers)        │                           │
  │                            │                           │
  │◄── HTTP 402 ───────────────│                           │
  │    x402-Invoice-Account    │                           │
  │    x402-Invoice-Amount     │                           │
  │    x402-Invoice-Reference  │                           │
  │                            │                           │
  │── CryptoTransfer ─────────────────────────────────────►│
  │   memo = Invoice UUID      │                           │
  │                            │◄── tx confirmed ──────────│
  │                            │    (Mirror Node poll)     │
  │                            │                           │
  │                            │── HCS audit write ───────►│
  │                            │                           │
  │── POST /mcp/tools/* ──────►│                           │
  │   x402-Payment-Receipt     │                           │
  │   = Hedera Tx ID           │                           │
  │                            │ validate: dest acct ✓     │
  │                            │ validate: amount    ✓     │
  │                            │ validate: UUID memo ✓     │
  │                            │                           │
  │                            │── call premium API ──────►│
  │◄── HTTP 200 + payload ─────│                           │`}</pre>
    </div>
  );
}

function Modes() {
  const [active, setActive] = useState('a');
  return (
    <div>
      <h2 style={s.h2}>Payment Modes</h2>
      <p style={s.p}>Two modes available. Client chooses based on workload pattern.</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { id: 'a', label: 'Mode A — Pay-Per-Call (x402)', sub: 'Best for: single or infrequent tool calls' },
          { id: 'b', label: 'Mode B — Session Allowance', sub: 'Best for: iterative loops (10+ back-to-back calls)' },
        ].map(({ id, label, sub }) => (
          <button key={id} onClick={() => setActive(id)} style={{
            flex: 1, padding: '14px 16px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
            backgroundColor: active === id ? COLORS.activeB : COLORS.card,
            border: `1px solid ${active === id ? COLORS.active : COLORS.border}`,
            transition: 'all 0.15s',
          }}>
            <div style={{ color: active === id ? COLORS.cyan : COLORS.text, fontWeight: 700, fontSize: 13, fontFamily: 'monospace', marginBottom: 4 }}>{label}</div>
            <div style={{ color: COLORS.muted, fontSize: 12 }}>{sub}</div>
          </button>
        ))}
      </div>

      {active === 'a' && (
        <div>
          <Card style={{ borderColor: COLORS.cyan + '33' }}>
            <h3 style={{ ...s.h3, marginTop: 0 }}>How It Works</h3>
            {[
              { actor: 'Agent', action: 'Sends POST /mcp/tools/* with no auth headers' },
              { actor: 'x402 Middleware', action: 'Returns HTTP 402 with Invoice Account, Amount, UUID Reference' },
              { actor: 'Hedera Agent Kit', action: 'Constructs CryptoTransferTransaction — appends UUID to memo field' },
              { actor: 'Human Hook', action: 'On mainnet: prompts "Authorize 0.5 HBAR? (y/n)" before broadcasting' },
              { actor: 'Facilitator', action: 'Validates invoice rules, sponsors gas, broadcasts to Hedera Consensus Node' },
              { actor: 'Agent', action: 'Retries with x402-Payment-Receipt: <Hedera Tx ID>' },
              { actor: 'validator.py', action: 'Queries Mirror Node — checks tx status, destination, UUID memo' },
              { actor: 'MCP Server', action: 'Unlocks .env vault, calls premium API, streams HTTP 200 response' },
            ].map((step, i) => <FlowStep key={i} num={i + 1} actor={step.actor} action={step.action} highlight={i === 1 || i === 5} />)}
          </Card>
          <pre style={s.code}>{`Agent                   MCP Server
  │── POST /mcp/* ─────►│  (no headers)
  │◄── 402 + Invoice ───│
  │                      │
  │── CryptoTransfer ───────────────► Hedera
  │   memo = UUID        │
  │                      │◄─ confirmed ──── Mirror Node
  │── POST /mcp/* ─────►│
  │   + Payment-Receipt  │
  │                      │  validate ✓✓✓
  │◄── HTTP 200 ─────────│`}</pre>
        </div>
      )}

      {active === 'b' && (
        <div>
          <Card style={{ borderColor: COLORS.green + '33' }}>
            <h3 style={{ ...s.h3, marginTop: 0 }}>Why Allowance Mode?</h3>
            <p style={s.p}>Per-call 402 round-trips add <strong style={{ color: COLORS.amber }}>2–4 seconds latency each</strong>. For an agent analysing 10 code files back-to-back, that's 20–40 seconds of pure overhead. Allowance mode drops this to <strong style={{ color: COLORS.green }}>sub-100ms</strong> for the entire session.</p>
            <h3 style={{ ...s.h3, marginTop: 8 }}>How It Works</h3>
            {[
              { actor: 'Agent', action: 'Calls APPROVE_HBAR_ALLOWANCE_TOOL — approves 20 HBAR spending limit for server account' },
              { actor: 'Agent', action: 'Sends POST /mcp/tools/* with x-allowance: true header' },
              { actor: 'MCP Server', action: 'Detects allowance header — skips 402 challenge entirely' },
              { actor: 'MCP Server', action: 'Pulls payment via TRANSFER_HBAR_WITH_ALLOWANCE_TOOL — no client pause' },
              { actor: 'MCP Server', action: 'Writes HCS audit entry, calls premium API' },
              { actor: 'Agent', action: 'Receives HTTP 200 — loop continues immediately with no interruption' },
              { actor: 'Agent', action: '[Repeats steps 2–6 until allowance is exhausted]' },
            ].map((step, i) => <FlowStep key={i} num={i + 1} actor={step.actor} action={step.action} highlight={i === 2 || i === 3} />)}
          </Card>
          <pre style={s.code}>{`Agent                   MCP Server              Hedera
  │── APPROVE_ALLOWANCE ───────────────────────────────►
  │   spender = server   │
  │   amount = 20 HBAR   │
  │                      │
  │── POST /mcp/* ─────►│  (x-allowance: true)
  │                      │── TRANSFER_WITH_ALLOWANCE ──►
  │                      │   (no client pause)
  │                      │── HCS log ──────────────────►
  │◄── HTTP 200 ─────────│
  │                      │
  │── POST /mcp/* ─────►│  [repeat — no 402 interrupt]
  │◄── HTTP 200 ─────────│
  │   [x10 with no       │
  │    interruption]     │`}</pre>
        </div>
      )}
    </div>
  );
}

function Flow() {
  return (
    <div>
      <h2 style={s.h2}>Execution Flow — Step by Step</h2>
      <p style={s.p}>Full x402 pay-per-call handshake. Nine steps from blind request to HTTP 200.</p>
      <Table
        headers={['#', 'Actor', 'Action', 'Output']}
        rows={[
          ['1', 'Agent', 'Sends POST /mcp/tools/execute-static-analysis — no auth headers', <Badge label="Blind Request" color={COLORS.muted} />],
          ['2', 'x402 Middleware', 'Intercepts. No receipt found. Issues 402 challenge.', <Badge label="HTTP 402" color={COLORS.amber} />],
          ['3', 'x402 Middleware', 'Attaches: Invoice-Account, Invoice-Amount, Invoice-Reference (UUID)', <Badge label="Invoice Headers" color={COLORS.amber} />],
          ['4', 'Hedera Agent Kit', 'Constructs CryptoTransferTransaction. Appends UUID to tx memo field.', <Badge label="Tx Signed" color={COLORS.cyan} />],
          ['5', 'Human Hook', 'On mainnet: "Authorize 0.5 HBAR? (y/n)" — awaits explicit confirmation.', <Badge label="Human Gate" color={COLORS.purple} />],
          ['6', 'Facilitator', 'Validates invoice rules. Sponsors gas. Broadcasts to Consensus Node.', <Badge label="On-Chain" color={COLORS.green} />],
          ['7', 'Agent', 'Retries request. Adds x402-Payment-Receipt: <Hedera Tx ID> header.', <Badge label="Retry" color={COLORS.cyan} />],
          ['8', 'validator.py', 'Queries Mirror Node async. Checks: tx SUCCESS + dest account + UUID memo.', <Badge label="Triple Check" color={COLORS.green} />],
          ['9', 'MCP Server', 'Unlocks .env vault. Calls premium API. Writes HCS audit. Returns payload.', <Badge label="HTTP 200" color={COLORS.green} />],
        ]}
        colColors={[COLORS.muted, COLORS.cyan, COLORS.text, null]}
      />

      <h3 style={s.h3}>Triple Validation — Step 8 Detail</h3>
      <pre style={s.code}>{`# validator.py — Mirror Node receipt check
async def validate_receipt(tx_id: str, invoice: Invoice) -> bool:
    tx = await mirror_node.get_transaction(tx_id)

    assert tx.status == "SUCCESS"                         # (1) tx cleared
    assert tx.transfers[SERVER_ACCOUNT] == invoice.amount # (2) correct destination + amount
    assert tx.memo == invoice.uuid                        # (3) UUID matches runtime invoice

    return True`}</pre>

      <h3 style={s.h3}>HCS Audit Entry Written at Step 9</h3>
      <pre style={s.code}>{`{
  "event":     "tool_executed",
  "uuid":      "inv-3a4f-91bc-...",
  "tx_id":     "0.0.XXXXXX@1234567890.000",
  "tool":      "execute-static-analysis",
  "amount":    "0.50000000",
  "timestamp": "2026-06-02T10:14:32Z"
}`}</pre>
    </div>
  );
}

function Refund() {
  return (
    <div>
      <h2 style={s.h2}>Failure & Refund Flow</h2>
      <p style={s.p}>
        When a premium downstream API (OCR engine, code scanner) fails or times out <em>after</em> payment has been verified,
        the server cannot keep the agent's funds. An autonomous refund hook reverses the transaction immediately.
      </p>

      <Card style={{ borderColor: COLORS.red + '44' }}>
        <div style={{ color: COLORS.red, fontWeight: 700, fontSize: 13, fontFamily: 'monospace', marginBottom: 10 }}>TRIGGER CONDITIONS</div>
        {['Proxied tool returns HTTP 503 or times out', 'Premium API is unavailable / rate-limited', 'Internal processing exception after payment settled'].map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <span style={{ color: COLORS.red }}>✕</span>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>{t}</span>
          </div>
        ))}
      </Card>

      <h3 style={s.h3}>Refund Sequence</h3>
      {[
        { actor: 'MCP Server', action: 'Payment verified ✓ — routes to premium API', ok: true },
        { actor: 'Premium API', action: 'Returns HTTP 503 Timeout or exception', ok: false },
        { actor: 'HCS Logger', action: 'Writes event: tool_failed — immutable record before any refund action', ok: null },
        { actor: 'Refund Hook', action: 'Triggers async CryptoTransfer back to agent wallet', ok: null },
        { actor: 'HCS Logger', action: 'Writes event: refund_sent with reverse Tx ID', ok: null },
        { actor: 'Agent', action: 'Receives HTTP 503 + refund_reference in response body', ok: false },
      ].map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 28, height: 28, borderRadius: '50%', backgroundColor: step.ok === true ? COLORS.green + '33' : step.ok === false ? COLORS.red + '33' : COLORS.border, color: step.ok === true ? COLORS.green : step.ok === false ? COLORS.red : COLORS.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
          <div>
            <span style={{ color: COLORS.cyan, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{step.actor}</span>
            <span style={{ color: '#94a3b8', fontSize: 13, marginLeft: 8 }}>{step.action}</span>
          </div>
        </div>
      ))}

      <pre style={s.code}>{`Agent                   MCP Server              Hedera
  │                          │                     │
  │  [payment verified ✓]    │                     │
  │                          │── call premium API ►│
  │                          │◄── 503 Timeout ─────│
  │                          │                     │
  │                          │── HCS write ────────►
  │                          │   event: tool_failed │
  │                          │                     │
  │                          │── async refund ─────►
  │                          │   CryptoTransfer     │
  │                          │   → agent wallet     │
  │                          │── HCS write ────────►
  │                          │   event: refund_sent │
  │                          │                     │
  │◄── HTTP 503 + refund_ref─│                     │`}</pre>

      <Card style={{ borderColor: COLORS.amber + '44', backgroundColor: '#1a120a' }}>
        <div style={{ color: COLORS.amber, fontWeight: 700, fontSize: 12, fontFamily: 'monospace', marginBottom: 6 }}>WHY THIS MATTERS FOR PRODUCTION</div>
        <p style={{ ...s.p, margin: 0 }}>
          Agent funds cannot be silently trapped by upstream dependency outages. The HCS write <em>before</em> the refund is dispatched means there is always a tamper-proof record of what happened — even if the refund itself is delayed. Judges and auditors can verify the full chain of events on Hashscan.
        </p>
      </Card>
    </div>
  );
}

function Components() {
  const rows = [
    ['MCP Server', 'FastAPI + Python MCP SDK', 'Tool routing, 402 lifecycle, credential vault access'],
    ['x402 Middleware', 'Python FastAPI middleware', 'Intercepts all tool requests, issues/validates invoices'],
    ['validator.py', 'asyncio + httpx', 'Async Mirror Node queries, triple-check receipt validation'],
    ['Secure Tool Registry', 'Python', 'Maps tool names → premium backend API calls'],
    ['API Credential Vault', 'Server-side .env', 'Stores all premium API keys — never exposed to clients'],
    ['HCS Audit Logger', 'Hedera Agent Kit core_consensus_plugin', 'Writes immutable state events to HCS topic'],
    ['Refund Hook', 'Async Python', 'Reverse-transfers HBAR to agent wallet on downstream failure'],
    ['Hedera Agent Kit', 'Python SDK v4', 'Client-side: sign/broadcast transactions, manage allowances'],
    ['x402 Facilitator', 'Hedera network node', 'Gas sponsorship + transaction broadcasting'],
    ['Mirror Node Listener', 'Hedera Mirror Node REST API', 'Transaction confirmation queries'],
    ['HCS Topic', 'Hedera Consensus Service', 'Permanent tamper-proof audit log'],
  ];
  return (
    <div>
      <h2 style={s.h2}>Component Inventory</h2>
      <p style={s.p}>Full breakdown of every component, its technology, and its single responsibility.</p>
      <Card>
        <Table
          headers={['Component', 'Technology', 'Responsibility']}
          rows={rows}
          colColors={[COLORS.cyan, COLORS.purple, COLORS.text]}
        />
      </Card>

      <h3 style={s.h3}>Dependency Graph</h3>
      <pre style={s.code}>{`CLIENT ENVIRONMENT
  └── LLM Agent Loop
        └── Hedera Agent Kit v4
              ├── CryptoTransferTransaction
              ├── APPROVE_HBAR_ALLOWANCE_TOOL
              └── TRANSFER_HBAR_WITH_ALLOWANCE_TOOL

MCP SERVER
  └── FastAPI
        ├── x402 Middleware (every request)
        │     ├── Invoice Generator
        │     └── validator.py (asyncio + httpx → Mirror Node)
        ├── Secure Tool Registry
        │     └── API Credential Vault (.env)
        ├── HCS Audit Logger
        │     └── core_consensus_plugin
        └── Refund Hook (async)
              └── CryptoTransfer (reverse)

HEDERA LEDGER
  ├── Consensus Node (mainnet / testnet)
  ├── x402 Facilitator (gas sponsor)
  ├── Mirror Node (tx index)
  └── HCS Topic (audit log)`}</pre>
    </div>
  );
}

function Contracts() {
  return (
    <div>
      <h2 style={s.h2}>Data Contracts</h2>
      <p style={s.p}>All headers, payloads, and validation schemas defined at the system boundary.</p>

      <h3 style={s.h3}>402 Challenge — Response Headers</h3>
      <pre style={s.code}>{`HTTP/1.1 402 Payment Required

x402-Invoice-Account:    0.0.XXXXXX          # Server Hedera account ID
x402-Invoice-Amount:     0.50000000          # HBAR (8 decimal places)
x402-Invoice-Reference:  uuid-v4-string      # Unique per-request tracking UUID`}</pre>

      <h3 style={s.h3}>Client Retry — Payment Receipt Header</h3>
      <pre style={s.code}>{`POST /mcp/tools/execute-static-analysis HTTP/1.1

x402-Payment-Receipt:    0.0.XXXXXX@1234567890-000000000  # Hedera Tx ID`}</pre>

      <h3 style={s.h3}>Mirror Node Validation (validator.py)</h3>
      <pre style={s.code}>{`async def validate_receipt(tx_id: str, invoice: Invoice) -> bool:
    tx = await mirror_node.get_transaction(tx_id)

    # Triple check — all three must pass
    assert tx.status == "SUCCESS"
    assert tx.transfers[SERVER_ACCOUNT] == invoice.amount
    assert tx.memo == invoice.uuid

    return True`}</pre>

      <h3 style={s.h3}>HCS Audit Message Schema</h3>
      <pre style={s.code}>{`{
  "event":     "402_issued"            # 402_issued | payment_verified
             | "tool_executed"         # tool_executed | tool_failed
             | "refund_sent",          # refund_sent

  "uuid":      "inv-3a4f-91bc-...",    # Invoice reference UUID
  "tx_id":     "0.0.XXXXXX@...",       # Hedera Transaction ID
  "tool":      "execute-static-analysis",
  "amount":    "0.50000000",
  "timestamp": "2026-06-02T10:14:32Z"
}`}</pre>

      <h3 style={s.h3}>HTTP 200 — Success Response</h3>
      <pre style={s.code}>{`HTTP/1.1 200 OK
Content-Type: application/json

{
  "tool":   "execute-static-analysis",
  "result": { ... },                   # Tool-specific payload
  "hcs_ref": "HCS sequence #XXXXX"    # Audit trail pointer
}`}</pre>

      <h3 style={s.h3}>HTTP 503 — Failure Response (with Refund Reference)</h3>
      <pre style={s.code}>{`HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "error":          "downstream_tool_failure",
  "refund_status":  "dispatched",
  "refund_tx_id":   "0.0.XXXXXX@...",  # Hedera refund Tx ID
  "hcs_ref":        "HCS sequence #XXXXX"
}`}</pre>
    </div>
  );
}

function Decisions() {
  const decisions = [
    {
      title: 'Stateless — No Database',
      color: COLORS.cyan,
      what: 'The Hedera Ledger is the only source of truth. Invoice UUIDs are stored in transaction memos, not a DB.',
      why: 'Eliminates an entire infrastructure dependency. Server can restart with zero state loss. Infinitely horizontally scalable.',
      tradeoff: 'Mirror Node query on every request adds ~50–200ms. Mitigated by asyncio.',
    },
    {
      title: 'asyncio + httpx for Mirror Node',
      color: COLORS.green,
      what: 'All Mirror Node queries are fully async — they never block the FastAPI event loop.',
      why: 'A synchronous Mirror Node call inside the 402 verify path would stall the entire server under concurrent agent load.',
      tradeoff: 'Adds async complexity to validator.py — simpler synchronous code would work at very low scale.',
    },
    {
      title: 'HCS for Audit Trail',
      color: COLORS.purple,
      what: 'Every 402 event, payment, execution, failure, and refund writes a lightweight message to a Hedera Consensus Service topic.',
      why: 'Provides trustless dispute resolution — neither party can alter the log retroactively. Visible live on Hashscan.',
      tradeoff: 'Each HCS write is a Hedera transaction (~0.001 HBAR). Negligible cost at current volumes but worth monitoring at scale.',
    },
    {
      title: 'Allowance Mode for Iterative Loops',
      color: COLORS.amber,
      what: 'Clients pre-approve a session budget via APPROVE_HBAR_ALLOWANCE_TOOL. Server pulls fractional amounts without interrupting the LLM loop.',
      why: 'Per-call 402 round-trips add 2–4s latency each. 10 tool calls = 20–40s of overhead. Allowance eliminates this entirely.',
      tradeoff: 'Allowance must be set before the session. If the LLM loop runs longer than budgeted, tools start failing with 402 again.',
    },
    {
      title: 'Server-Side .env Credential Vault',
      color: COLORS.red,
      what: 'All premium API keys live exclusively on the server. Clients receive only tool outputs, never credentials.',
      why: 'The entire value proposition of the proxy is that agents never need API keys. Exposing keys in responses would destroy this.',
      tradeoff: 'Server becomes a single point of credential compromise — requires strong infra security on the deployment environment.',
    },
    {
      title: 'Refund Hook on Downstream Failure',
      color: COLORS.indigo,
      what: 'If a proxied tool fails after payment, the server autonomously reverses the HBAR transfer back to the agent wallet.',
      why: 'Agent funds cannot be trapped by upstream outages. Production-readiness signal. Required for fair machine-economy participation.',
      tradeoff: 'Refund adds an additional on-chain transaction per failure — small cost but worth tracking in high-failure-rate scenarios.',
    },
  ];

  return (
    <div>
      <h2 style={s.h2}>Design Decisions</h2>
      <p style={s.p}>Key architectural decisions, the rationale behind each, and the trade-off accepted.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {decisions.map(({ title, color, what, why, tradeoff }) => (
          <Card key={title} style={{ borderLeft: `4px solid ${color}` }}>
            <div style={{ color, fontWeight: 700, fontSize: 14, fontFamily: 'monospace', marginBottom: 10 }}>{title}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: 'WHAT', text: what, c: COLORS.text },
                { label: 'WHY', text: why, c: COLORS.green },
                { label: 'TRADE-OFF', text: tradeoff, c: COLORS.amber },
              ].map(({ label, text, c }) => (
                <div key={label}>
                  <div style={{ color: COLORS.muted, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                  <div style={{ color: c, fontSize: 12, lineHeight: 1.6 }}>{text}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function HederaServices() {
  const services = [
    { service: 'Hedera Consensus Service (HCS)', usage: 'Immutable audit log — every 402 event, payment, execution, failure, refund', rubric: 'Native Hedera service integration', color: COLORS.purple },
    { service: 'Hedera Token Service (HTS)', usage: 'USDC token transfers as alternative payment currency to HBAR', rubric: 'Native Hedera service integration', color: COLORS.purple },
    { service: 'x402 Facilitator', usage: 'Gas sponsorship + transaction broadcasting for client agents', rubric: 'x402 payment protocol', color: COLORS.cyan },
    { service: 'CryptoTransfer', usage: 'Per-call HBAR micro-payment from agent wallet to server account', rubric: 'Core ledger mechanic', color: COLORS.green },
    { service: 'HBAR Token Allowance', usage: 'Pre-approved session budget enabling zero-interrupt iterative tool loops', rubric: 'Advanced ledger mechanic', color: COLORS.amber },
    { service: 'Mirror Node', usage: 'Async transaction receipt validation — confirms settlement before tool execution', rubric: 'Off-ledger query layer', color: COLORS.indigo },
    { service: 'Hedera Agent Kit v4', usage: 'Client-side tx construction, allowance tools, HCS writes via plugins', rubric: 'Official Hedera agent tooling', color: COLORS.cyan },
  ];

  return (
    <div>
      <h2 style={s.h2}>Hedera Services Used</h2>
      <p style={s.p}>Seven distinct Hedera services integrated across the system. Mapped to hackathon rubric items.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {services.map(({ service, usage, rubric, color }) => (
          <Card key={service} style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 1.5fr', gap: 16, alignItems: 'center', padding: '14px 20px' }}>
            <div style={{ color, fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{service}</div>
            <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{usage}</div>
            <div><Badge label={rubric} color={color} /></div>
          </Card>
        ))}
      </div>

      <h3 style={s.h3}>Agent Kit Integration Points</h3>
      <pre style={s.code}>{`from hedera_agent_kit import HederaAgentKit

kit = HederaAgentKit(account_id, private_key, network="testnet")

# Pay-per-call — client side
kit.crypto_transfer(to=SERVER_ACCOUNT, amount=0.5, memo=invoice_uuid)

# Allowance mode — client side
kit.approve_hbar_allowance(spender=SERVER_ACCOUNT, amount=20.0)

# Allowance pull — server side
kit.transfer_hbar_with_allowance(from=agent_wallet, to=SERVER_ACCOUNT, amount=0.5)

# Audit logging — server side
kit.core_consensus_plugin.submit_message(
    topic_id=AUDIT_TOPIC,
    message=json.dumps(audit_event)
)`}</pre>
    </div>
  );
}

function Security() {
  return (
    <div>
      <h2 style={s.h2}>Security Boundaries</h2>
      <p style={s.p}>Two distinct surfaces. Clear separation of what clients can and cannot access.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Card style={{ borderColor: COLORS.amber + '44' }}>
          <div style={{ color: COLORS.amber, fontWeight: 700, fontSize: 12, fontFamily: 'monospace', marginBottom: 10 }}>PUBLIC SURFACE (Agent-Facing)</div>
          {['POST /mcp/tools/* endpoint', 'HTTP 402 Invoice headers (account ID, amount, UUID)', 'x402-Payment-Receipt validation', 'HTTP 200 tool output payload', 'HTTP 503 failure + refund reference'].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
              <span style={{ color: COLORS.amber }}>›</span>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>{item}</span>
            </div>
          ))}
        </Card>
        <Card style={{ borderColor: COLORS.red + '44' }}>
          <div style={{ color: COLORS.red, fontWeight: 700, fontSize: 12, fontFamily: 'monospace', marginBottom: 10 }}>INTERNAL SURFACE (Server-Only)</div>
          {['Premium API keys (.env vault)', 'Raw premium API calls + responses before filtering', 'Refund transaction initiation', 'Invoice UUID runtime memory', 'Mirror Node auth credentials'].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
              <span style={{ color: COLORS.red }}>✕</span>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>{item}</span>
            </div>
          ))}
        </Card>
      </div>

      <h3 style={s.h3}>Security Properties</h3>
      <Table
        headers={['Property', 'How Achieved', 'Verification']}
        rows={[
          ['API keys never exposed', 'Stored server-side in .env — clients receive only tool output', 'Code review of all response serialisers'],
          ['Payment triple-checked', 'Mirror Node query: status + dest account + UUID memo', 'validator.py assertion suite'],
          ['No state forgery', 'UUID is runtime-generated per request — cannot be replayed', 'Hedera ledger consensus is canonical'],
          ['Tamper-proof audit', 'HCS writes are cryptographically ordered — cannot be altered post-write', 'Verify on Hashscan'],
          ['No user PII stored', 'Stateless design — only invoice UUID + Hedera Tx IDs retained in memory', 'No database, no logs with personal data'],
          ['Refund cannot be withheld', 'Async refund hook fires before 503 response is returned', 'HCS log pre-dates refund dispatch'],
        ]}
        colColors={[COLORS.cyan, COLORS.text, COLORS.green]}
      />

      <h3 style={s.h3}>Attack Surface Diagram</h3>
      <pre style={s.code}>{`INTERNET
   │
   ▼
┌──────────────────────┐
│  PUBLIC SURFACE      │  POST /mcp/tools/*
│  (Agent-facing)      │  Only receives: tool name + payment receipt header
└──────────┬───────────┘
           │
     x402 Middleware gates ALL traffic
     ↓ validated only
┌──────────▼───────────┐
│  INTERNAL SURFACE    │  Premium API calls
│  (Server-side only)  │  .env credential vault
│                      │  Refund initiation
│                      │  HCS writes
└──────────────────────┘

No path from PUBLIC to .env vault without
passing triple-validated payment check.`}</pre>
    </div>
  );
}

const SECTIONS = { overview: Overview, topology: Topology, modes: Modes, flow: Flow, refund: Refund, components: Components, contracts: Contracts, decisions: Decisions, hedera: HederaServices, security: Security };

export default function ArchitectureDocs() {
  const [active, setActive] = useState('overview');
  const Section = SECTIONS[active];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{ width: 220, flexShrink: 0, backgroundColor: COLORS.sidebar, borderRight: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '20px 16px 14px', borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ color: COLORS.cyan, fontWeight: 800, fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.04em' }}>HEDERA x402</div>
          <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>Architecture Document</div>
        </div>
        <nav style={{ padding: '8px 0', flex: 1 }}>
          {NAV.map(({ id, label }) => {
            const isActive = active === id;
            return (
              <button key={id} onClick={() => setActive(id)} style={{
                width: '100%', textAlign: 'left', padding: '9px 16px',
                backgroundColor: isActive ? COLORS.activeB : 'transparent',
                color: isActive ? COLORS.cyan : COLORS.muted,
                border: 'none', borderLeft: `3px solid ${isActive ? COLORS.active : 'transparent'}`,
                cursor: 'pointer', fontSize: 12, fontFamily: 'monospace',
                transition: 'all 0.12s', fontWeight: isActive ? 700 : 400,
              }}>
                {label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ color: COLORS.muted, fontSize: 10, fontFamily: 'monospace' }}>onAiR / 2026-06-02</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        <div style={{ maxWidth: 860 }}>
          <Section />
        </div>
      </div>
    </div>
  );
}
