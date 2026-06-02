import { useState, useEffect, useRef } from 'react';

const C = {
  bg: '#0a0f1e', card: '#111827', sidebar: '#0d1526',
  border: '#1e2d45', text: '#e2e8f0', muted: '#64748b',
  cyan: '#38bdf8', green: '#10b981', amber: '#f59e0b',
  red: '#ef4444', purple: '#a855f7', indigo: '#6366f1',
};

const P_COLOR = { P0: C.red, P1: C.amber, P2: C.cyan, P3: C.muted };
const P_BG    = { P0: '#2d1010', P1: '#1f1500', P2: '#0c1f30', P3: '#1a1a1a' };

const OUTCOMES = [
  { id: 'O1', label: 'Zero-Key Tool Access', desc: 'Agent calls premium tool with no pre-registered API keys — end to end on testnet', color: C.cyan },
  { id: 'O2', label: 'On-Chain Payment Verified', desc: 'Mirror Node triple-check passes before any tool executes', color: C.green },
  { id: 'O3', label: 'Tamper-Proof Audit Trail', desc: 'HCS events visible and sequenced on Hashscan for every session', color: C.purple },
  { id: 'O4', label: 'Agent Funds Protected', desc: 'Refund dispatched within 5s of confirmed downstream failure', color: C.amber },
  { id: 'O5', label: 'Iterative Loops Uninterrupted', desc: '10 back-to-back tool calls with zero 402 interrupts in allowance mode', color: C.indigo },
  { id: 'O6', label: 'Credentials Never Exposed', desc: 'No API key appears in any response body or header', color: C.red },
];

const EPICS = [
  { id: 'E1', label: 'MCP Server Foundation',         priority: 'P0', outcomes: ['O1'],       color: C.red },
  { id: 'E2', label: 'Core x402 Pay-Per-Call Rail',   priority: 'P0', outcomes: ['O1','O2'],  color: C.red },
  { id: 'E3', label: 'Payment Receipt Validation',    priority: 'P0', outcomes: ['O2'],       color: C.red },
  { id: 'E4', label: 'HCS Immutable Audit Trail',     priority: 'P1', outcomes: ['O3'],       color: C.amber },
  { id: 'E5', label: 'Graceful Failure & Auto-Refund',priority: 'P1', outcomes: ['O4'],       color: C.amber },
  { id: 'E6', label: 'Session Allowance Mode',        priority: 'P2', outcomes: ['O5'],       color: C.cyan },
  { id: 'E7', label: 'Secure Tool Registry',          priority: 'P2', outcomes: ['O1','O6'],  color: C.cyan },
  { id: 'E8', label: 'Human-in-the-Loop Gate',        priority: 'P3', outcomes: ['O1'],       color: C.muted },
];

const STORIES = [
  // E1
  {
    id: 'S1.1', epic: 'E1', priority: 'P0', title: 'Runnable FastAPI + MCP Server',
    role: 'agent developer', want: 'a running MCP-compatible server endpoint',
    outcome: 'my agent can discover and call tools via the standard MCP protocol',
    ac: [
      'POST /mcp/tools returns list of registered tools with names and descriptions',
      'Server starts cleanly with uvicorn on port 8000',
      'GET /health returns { "status": "ok" }',
      'Server handles concurrent requests without blocking',
    ],
    outOfScope: 'Auth, payment, any specific tool implementation',
    blocks: 'Everything else',
  },
  {
    id: 'S1.2', epic: 'E1', priority: 'P0', title: 'Credential Vault (server-side .env)',
    role: 'tool provider', want: 'premium API keys loaded from server-side environment variables only',
    outcome: 'no client request can ever retrieve or infer a credential',
    ac: [
      '.env file loaded at startup via python-dotenv',
      'Keys accessible to tool handlers internally',
      'No key appears in any HTTP response body, header, or log output',
      'Server fails fast at startup with clear error if a required key is missing',
      '.env is in .gitignore',
    ],
    outOfScope: 'Key rotation, secrets manager integration',
    blocks: 'S1.3, all tool stories',
  },
  {
    id: 'S1.3', epic: 'E1', priority: 'P0', title: 'First Premium Tool: Static Code Analysis',
    role: 'agent developer', want: 'a working static code analysis tool registered on the server',
    outcome: 'I have a real end-to-end payable tool to demo and test against',
    ac: [
      'Tool name: execute-static-analysis',
      'Accepts: { "code": "<string>", "language": "<string>" }',
      'Returns analysis result payload from upstream API',
      'Returns HTTP 400 with clear message if input is malformed',
      'Returns HTTP 503 (not 500) if upstream API is unreachable',
    ],
    outOfScope: 'Multiple tools (that is E7)',
    blocks: 'S2.3',
  },
  // E2
  {
    id: 'S2.1', epic: 'E2', priority: 'P0', title: 'x402 Middleware — Issue 402 Challenge',
    role: 'agent', want: 'a structured HTTP 402 response when I call a tool without a payment receipt',
    outcome: 'I know exactly how much to pay, where to pay it, and how to track the transaction',
    ac: [
      'All POST /mcp/tools/* requests without x402-Payment-Receipt receive HTTP 402',
      'Response includes: x402-Invoice-Account, x402-Invoice-Amount, x402-Invoice-Reference (UUID v4)',
      'UUID is generated fresh per request — never reused',
      'UUID held in server memory for retry window',
      'Response body: { "error": "payment_required", "invoice": { ... } }',
    ],
    outOfScope: 'Per-tool pricing (all tools same price at MVP)',
    blocks: 'S2.3',
  },
  {
    id: 'S2.2', epic: 'E2', priority: 'P0', title: 'Client: CryptoTransfer with UUID Memo',
    role: 'agent developer', want: 'the Agent Kit to construct and broadcast a CryptoTransfer with the invoice UUID in the memo',
    outcome: 'the server can match the on-chain payment to the specific request',
    ac: [
      'Agent Kit called with: destination = server account, amount = invoice amount, memo = UUID',
      'Transaction broadcasts to Hedera testnet successfully',
      'Hedera Transaction ID returned to the agent for use in retry',
      'If broadcast fails, error surfaced clearly — no silent retry',
    ],
    outOfScope: 'Gas estimation, mainnet. Testnet only.',
    blocks: 'S2.3',
  },
  {
    id: 'S2.3', epic: 'E2', priority: 'P0', title: 'Accept Retry + Execute Tool (HTTP 200)',
    role: 'agent', want: 'to retry my tool request with the payment receipt header and receive the tool result',
    outcome: 'the full pay-and-execute loop completes end to end',
    ac: [
      'POST /mcp/tools/* with valid x402-Payment-Receipt routes to E3 validation',
      'On validation pass: tool executes and result returned as HTTP 200',
      'On validation fail: HTTP 402 re-issued (not 500)',
      'Receipt cannot be replayed: same UUID consumed = HTTP 402',
      'Tool execution does not start until validation is confirmed',
    ],
    outOfScope: 'Allowance mode (E6), refunds (E5)',
    blocks: 'Hackathon demo',
  },
  // E3
  {
    id: 'S3.1', epic: 'E3', priority: 'P0', title: 'Async Mirror Node Query',
    role: 'server', want: 'to query the Hedera Mirror Node asynchronously for a transaction ID',
    outcome: 'validation never blocks the event loop under concurrent agent load',
    ac: [
      'validator.py uses asyncio + httpx for all Mirror Node calls',
      'Completes without blocking other in-flight requests',
      'Timeout after 10 seconds with { "error": "validation_timeout" } — does not hang',
      'Mirror Node URL configurable via .env (testnet + mainnet endpoints)',
    ],
    outOfScope: 'Caching Mirror Node results',
    blocks: 'S3.2',
  },
  {
    id: 'S3.2', epic: 'E3', priority: 'P0', title: 'Triple-Check Receipt Validation',
    role: 'server', want: 'to validate three conditions on every payment receipt',
    outcome: 'no forged, redirected, or replayed transaction can unlock tool execution',
    ac: [
      'Check 1: tx.status == "SUCCESS"',
      'Check 2: tx.transfers[SERVER_ACCOUNT] == invoice_amount',
      'Check 3: tx.memo == invoice_uuid',
      'All three must pass — partial pass returns HTTP 402, not HTTP 200',
      'Failure reason logged server-side — not exposed to client',
      'Client receives { "error": "payment_invalid" } — no check detail leaked',
    ],
    outOfScope: 'Partial amount acceptance, rounding tolerance',
    blocks: 'S2.3',
  },
  // E4
  {
    id: 'S4.1', epic: 'E4', priority: 'P1', title: 'HCS Topic Provisioned',
    role: 'tool provider', want: 'a dedicated HCS topic for this server\'s audit log',
    outcome: 'all events write to a single, identifiable, publicly verifiable topic on Hashscan',
    ac: [
      'Topic created via Hedera Agent Kit core_consensus_plugin',
      'Topic ID stored in .env as HCS_AUDIT_TOPIC_ID',
      'Topic readable on Hashscan (public, no submit key for reads)',
      'Server fails to start if HCS_AUDIT_TOPIC_ID is not set',
    ],
    outOfScope: 'Topic access control, multiple topics per tool',
    blocks: 'S4.2',
  },
  {
    id: 'S4.2', epic: 'E4', priority: 'P1', title: 'Write Audit Events on Every State Transition',
    role: 'judge / auditor', want: 'every payment state transition written to HCS',
    outcome: 'I can verify the complete M2M interaction history on Hashscan without trusting either party',
    ac: [
      'Events written for: 402_issued, payment_verified, tool_executed, tool_failed, refund_sent',
      'Each event includes: event, uuid, tx_id, tool, amount, timestamp',
      'HCS write is fire-and-forget async — tool execution does not wait for HCS confirmation',
      'Write failure logged server-side but does not fail the user-facing request',
      'Events visible on Hashscan within ~5 seconds',
    ],
    outOfScope: 'Querying HCS events via API',
    blocks: 'S5.3',
  },
  // E5
  {
    id: 'S5.1', epic: 'E5', priority: 'P1', title: 'Detect Downstream Failure Post-Payment',
    role: 'server', want: 'to detect when a proxied tool fails after payment has been verified',
    outcome: 'the refund hook is triggered before the error response is returned',
    ac: [
      'Failure defined as: HTTP 4xx/5xx from upstream API, or timeout after 15 seconds',
      'Detection fires only after payment_verified — not for pre-payment errors',
      'Failure type logged: { "type": "upstream_error" | "upstream_timeout", "status_code": N }',
      'Does not trigger for malformed client input (that is a 400, not a refund scenario)',
    ],
    outOfScope: 'Partial failure, stream interruptions',
    blocks: 'S5.2',
  },
  {
    id: 'S5.2', epic: 'E5', priority: 'P1', title: 'Async Refund via CryptoTransfer',
    role: 'agent', want: 'my HBAR automatically returned when the tool I paid for fails to execute',
    outcome: 'my agent\'s budget is not silently drained by upstream dependency outages',
    ac: [
      'Refund CryptoTransfer dispatched to agent wallet within 5 seconds of failure detection',
      'Refund amount = exact amount paid (no partial refunds)',
      'Dispatched asynchronously — does not block HTTP 503 response',
      'HTTP 503 body includes: { "error": "downstream_failure", "refund_status": "dispatched", "refund_tx_id": "..." }',
      'If refund itself fails: logged to HCS as refund_failed — not silently dropped',
    ],
    outOfScope: 'Partial refunds, refund dispute UI',
    blocks: 'S5.3',
  },
  {
    id: 'S5.3', epic: 'E5', priority: 'P1', title: 'HCS Logged Before and After Refund',
    role: 'auditor', want: 'failure and refund events written to HCS in sequence',
    outcome: 'there is a tamper-proof record that the refund was initiated before the error response was sent',
    ac: [
      'tool_failed HCS event written before refund is dispatched',
      'refund_sent HCS event written after refund Tx ID is known',
      'Both events reference the same uuid and original tx_id',
      'Sequence on Hashscan shows tool_failed before refund_sent',
    ],
    outOfScope: 'HCS replay / query API',
    blocks: '—',
  },
  // E6
  {
    id: 'S6.1', epic: 'E6', priority: 'P2', title: 'Server Detects Allowance Header',
    role: 'agent', want: 'to signal that I have pre-approved an HBAR allowance',
    outcome: 'the server skips the 402 challenge and pulls payment from my allowance',
    ac: [
      'x-allowance: true header triggers allowance path',
      'Server verifies allowance exists and is sufficient before calling tool',
      'Insufficient allowance returns HTTP 402 with "allowance_insufficient"',
      'No allowance approved returns HTTP 402 with "allowance_not_found"',
    ],
    outOfScope: 'Allowance creation via the server',
    blocks: 'S6.2',
  },
  {
    id: 'S6.2', epic: 'E6', priority: 'P2', title: 'Server Pulls Payment via Allowance Tool',
    role: 'server', want: 'to pull tool payment from the agent\'s pre-approved allowance',
    outcome: 'the tool executes without interrupting the agent\'s LLM loop',
    ac: [
      'TRANSFER_HBAR_WITH_ALLOWANCE_TOOL called server-side for allowance-mode requests',
      'Payment pulled before tool execution begins',
      'HCS payment_verified event written (same schema as Mode A)',
      'Transfer completes in < 2 seconds',
      'Tool executes only after allowance pull is confirmed',
    ],
    outOfScope: 'Allowance refill notifications',
    blocks: '—',
  },
  // E7
  {
    id: 'S7.1', epic: 'E7', priority: 'P2', title: 'Config-Driven Tool Registration',
    role: 'tool provider', want: 'to register a new tool by adding config rather than writing server code',
    outcome: 'the proxy can be extended without a deployment per tool',
    ac: [
      'Tools defined in tools.yaml: name, description, price_hbar, upstream_url, env_key',
      'Server loads tool registry at startup',
      'New tool in config + restart = immediately discoverable via MCP',
      'Removed tool returns 404, not a crash',
    ],
    outOfScope: 'Hot-reload (config changes require restart at MVP)',
    blocks: 'S7.2, S7.3',
  },
  {
    id: 'S7.2', epic: 'E7', priority: 'P2', title: 'OCR Extraction Tool',
    role: 'agent developer', want: 'a second registered tool (OCR extraction)',
    outcome: 'the demo shows the proxy as a multi-tool platform, not a single-purpose server',
    ac: [
      'Tool name: ocr-extract',
      'Accepts: { "file_url": "<string>", "output_format": "text" | "structured" }',
      'Returns extracted text or structured data from upstream OCR API',
      'Uses a different .env credential than the code analysis tool',
      'Has its own pricing entry in tools.yaml',
    ],
    outOfScope: 'PDF multi-page support, image preprocessing',
    blocks: '—',
  },
  {
    id: 'S7.3', epic: 'E7', priority: 'P2', title: 'Per-Tool Pricing',
    role: 'tool provider', want: 'to set a different price per tool',
    outcome: 'expensive upstream APIs can charge more than cheap ones',
    ac: [
      'price_hbar field in tool config drives the x402-Invoice-Amount value',
      'Invoice amount reflects the specific tool being called',
      'Price change in config takes effect on restart',
    ],
    outOfScope: 'Dynamic pricing, surge pricing',
    blocks: '—',
  },
  // E8
  {
    id: 'S8.1', epic: 'E8', priority: 'P3', title: 'Mainnet Authorization Prompt',
    role: 'developer on mainnet', want: 'my agent to pause and ask me to confirm before broadcasting real HBAR',
    outcome: 'I cannot accidentally spend real funds due to a misconfigured agent loop',
    ac: [
      'When HEDERA_NETWORK=mainnet: outputs "Tool execution requires 0.5 HBAR. Authorize? (y/n)"',
      'Agent loop pauses until explicit y input',
      'n input cancels cleanly — no partial transaction broadcast',
      'On testnet: gate bypassed automatically — no prompt',
    ],
    outOfScope: 'GUI approval UI, mobile push approval',
    blocks: '—',
  },
];

const MVP_IDS = ['S1.1','S1.2','S1.3','S2.1','S2.2','S2.3','S3.1','S3.2','S4.1','S4.2','S5.1','S5.2','S5.3'];

function PBadge({ p }) {
  return (
    <span style={{ backgroundColor: P_BG[p], color: P_COLOR[p], padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>{p}</span>
  );
}

export default function BacklogView({ jumpToStory }) {
  const [activeEpic, setActiveEpic] = useState('ALL');
  const [activeStory, setActiveStory] = useState(null);
  const [showMvpOnly, setShowMvpOnly] = useState(false);
  const storyListRef = useRef(null);

  // When a navigation intent arrives, select the story and ensure its epic is visible
  useEffect(() => {
    if (!jumpToStory) return;
    const target = STORIES.find(s => s.id === jumpToStory);
    if (!target) return;
    setActiveStory(jumpToStory);
    setActiveEpic('ALL');   // ensure it's always visible regardless of current filter
    setShowMvpOnly(false);
    // Scroll the story into view after render
    setTimeout(() => {
      const el = document.getElementById(`story-row-${jumpToStory}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, [jumpToStory]);

  const filteredStories = STORIES
    .filter(s => activeEpic === 'ALL' || s.epic === activeEpic)
    .filter(s => !showMvpOnly || MVP_IDS.includes(s.id));

  const story = activeStory ? STORIES.find(s => s.id === activeStory) : null;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', backgroundColor: C.bg, fontFamily: 'system-ui, sans-serif' }}>

      {/* Left — Epic filter + story list */}
      <div style={{ width: 300, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Outcomes strip */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 8 }}>DESIRED OUTCOMES</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {OUTCOMES.map(o => (
              <span key={o.id} title={o.desc} style={{ backgroundColor: o.color + '22', color: o.color, padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', cursor: 'help' }}>{o.id}</span>
            ))}
          </div>
        </div>

        {/* Epic filter */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 8 }}>FILTER BY EPIC</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button onClick={() => setActiveEpic('ALL')} style={{ textAlign: 'left', padding: '5px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: activeEpic === 'ALL' ? '#1e2d45' : 'transparent', color: activeEpic === 'ALL' ? C.cyan : C.muted, fontSize: 12, fontFamily: 'monospace' }}>All Epics</button>
            {EPICS.map(e => (
              <button key={e.id} onClick={() => setActiveEpic(e.id)} style={{ textAlign: 'left', padding: '5px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: activeEpic === e.id ? '#1e2d45' : 'transparent', color: activeEpic === e.id ? C.cyan : C.muted, fontSize: 12, fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{e.id} — {e.label.length > 22 ? e.label.slice(0, 22) + '…' : e.label}</span>
                <PBadge p={e.priority} />
              </button>
            ))}
          </div>
        </div>

        {/* MVP toggle */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="mvp" checked={showMvpOnly} onChange={e => setShowMvpOnly(e.target.checked)} style={{ cursor: 'pointer' }} />
          <label htmlFor="mvp" style={{ color: C.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'monospace' }}>MVP only (stories 1–13)</label>
        </div>

        {/* Story list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {filteredStories.map((s, i) => (
            <button id={`story-row-${s.id}`} key={s.id} onClick={() => setActiveStory(s.id)} style={{
              width: '100%', textAlign: 'left', padding: '10px 16px',
              border: 'none', borderLeft: `3px solid ${activeStory === s.id ? P_COLOR[s.priority] : 'transparent'}`,
              backgroundColor: activeStory === s.id ? '#111827' : 'transparent',
              cursor: 'pointer', transition: 'all 0.1s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ color: C.muted, fontSize: 10, fontFamily: 'monospace' }}>#{i + 1}  {s.id}</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {MVP_IDS.includes(s.id) && <span style={{ color: C.green, fontSize: 9, fontFamily: 'monospace' }}>MVP</span>}
                  <PBadge p={s.priority} />
                </div>
              </div>
              <div style={{ color: activeStory === s.id ? C.text : '#94a3b8', fontSize: 12, fontWeight: activeStory === s.id ? 600 : 400, lineHeight: 1.4 }}>{s.title}</div>
              <div style={{ color: C.muted, fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>{s.epic}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Right — Story detail */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>
        {!story ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.muted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13 }}>Select a story to view details</div>
          </div>
        ) : (
          <div style={{ maxWidth: 700 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ color: C.muted, fontFamily: 'monospace', fontSize: 12 }}>{story.id}</span>
              <span style={{ color: C.muted, fontFamily: 'monospace', fontSize: 12 }}>·</span>
              <span style={{ color: C.muted, fontFamily: 'monospace', fontSize: 12 }}>{story.epic}</span>
              <PBadge p={story.priority} />
              {MVP_IDS.includes(story.id) && <span style={{ backgroundColor: C.green + '22', color: C.green, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>MVP</span>}
            </div>
            <h2 style={{ color: C.cyan, fontFamily: 'monospace', fontSize: 20, fontWeight: 700, margin: '0 0 20px 0' }}>{story.title}</h2>

            {/* User Story */}
            <div style={{ backgroundColor: '#0d1526', border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 8 }}>USER STORY</div>
              <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.8 }}>
                <span style={{ color: C.muted }}>As a </span><span style={{ color: C.amber }}>{story.role}</span>,<br />
                <span style={{ color: C.muted }}>I want </span><span style={{ color: C.text }}>{story.want}</span>,<br />
                <span style={{ color: C.muted }}>So that </span><span style={{ color: C.green }}>{story.outcome}</span>.
              </div>
            </div>

            {/* AC */}
            <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 10 }}>ACCEPTANCE CRITERIA</div>
              {story.ac.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 20, height: 20, border: `1px solid ${C.border}`, borderRadius: 3, marginTop: 1, flexShrink: 0 }} />
                  <span style={{ color: C.text, fontSize: 13, lineHeight: 1.5 }}>{a}</span>
                </div>
              ))}
            </div>

            {/* Out of scope + blocks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 18px' }}>
                <div style={{ color: C.red, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 6 }}>OUT OF SCOPE</div>
                <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{story.outOfScope}</div>
              </div>
              <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 18px' }}>
                <div style={{ color: C.amber, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 6 }}>BLOCKS</div>
                <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{story.blocks}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
