import { useState, useRef } from 'react';
import { useStore } from './storeContext';
import { useNav } from './navContext';

// Which epics belong to each phase
const PHASE_EPICS = {
  ALL: ['E1','E2','E3','E4','E5','E6','E7','E8','E9'],
  P1:  ['E1','E2','E3'],
  P2:  ['E4','E5','E9'],
  P3:  ['E6','E7'],
  P4:  ['E8'],
};

const EPIC_LABELS = {
  E1:'MCP Foundation', E2:'x402 Rail', E3:'Validation',
  E4:'HCS Audit',      E5:'Refund Hook', E6:'Allowance Mode',
  E7:'Tool Registry',  E8:'Mainnet Gate', E9:'Demo Observability',
};

// Which phase an epic belongs to (for roadmap navigation)
const EPIC_TO_PHASE = {
  E1:'P1', E2:'P1', E3:'P1',
  E4:'P2', E5:'P2', E9:'P2',
  E6:'P3', E7:'P3',
  E8:'P4',
};

const C = {
  bg: '#0a0f1e', card: '#111827', sidebar: '#0d1526',
  border: '#1e2d45', text: '#e2e8f0', muted: '#64748b',
  cyan: '#38bdf8', green: '#10b981', amber: '#f59e0b',
  red: '#ef4444', purple: '#a855f7', indigo: '#6366f1',
  teal: '#14b8a6',
};

const P_COLOR  = { P0: C.red, P1: C.amber, P2: C.cyan, P3: C.muted };
const EPIC_CLR = { E1: C.red, E2: C.red, E3: C.red, E4: C.amber, E5: C.amber, E6: C.cyan, E7: C.cyan, E8: C.purple, E9: C.teal };

const COLUMNS = [
  { id: 'backlog',    label: 'Backlog',     color: C.muted,   bg: '#0d1526' },
  { id: 'inprogress', label: 'In Progress', color: C.amber,   bg: '#1a120a' },
  { id: 'review',     label: 'Review',      color: C.indigo,  bg: '#0d0f26' },
  { id: 'done',       label: 'Done',        color: C.green,   bg: '#0a1a12' },
  { id: 'blocked',    label: 'Blocked',     color: C.red,     bg: '#1a0a0a' },
];

const STATUS_NEXT = {
  backlog:    'inprogress',
  inprogress: 'review',
  review:     'done',
  done:       'done',
  blocked:    'backlog',
};
const STATUS_LABEL = {
  backlog: 'Start', inprogress: 'Mark Review', review: 'Mark Done', done: '✓ Done', blocked: 'Unblock',
};

// All 22 stories (Sprint 8 additions: S7.3 updated, S7.4, S7.5 added)
const ALL_STORIES = [
  { id:'S1.1', epic:'E1', priority:'P0', title:'Runnable FastAPI + MCP Server',
    role:'agent developer', want:'a running MCP-compatible server endpoint',
    ac:['POST /mcp/tools returns list of tools','Server starts on port 8000','GET /health → { "status":"ok" }','Handles concurrent requests'],
    phase:'P1', blocks:'Everything' },
  { id:'S1.2', epic:'E1', priority:'P0', title:'Credential Vault (server-side .env)',
    role:'tool provider', want:'API keys loaded from server-side env only',
    ac:['Load .env at startup','Keys never appear in response body/headers/logs','Fail fast at startup if key missing','.env in .gitignore'],
    phase:'P1', blocks:'All tools' },
  { id:'S1.3', epic:'E1', priority:'P0', title:'First Tool: Static Code Analysis',
    role:'agent developer', want:'a working code analysis tool on the server',
    ac:['Tool: execute-static-analysis','Accepts { code, language }','Returns analysis from upstream API','400 on bad input, 503 on upstream failure'],
    phase:'P1', blocks:'S2.3' },
  { id:'S2.1', epic:'E2', priority:'P0', title:'x402 Middleware — Issue 402 Challenge',
    role:'agent', want:'a structured 402 when calling without payment',
    ac:['All /mcp/tools/* without receipt header → 402','Response: Invoice-Account, Invoice-Amount, Invoice-Reference (UUID v4)','UUID fresh per request, held in memory','Body: { error: "payment_required", invoice: {...} }'],
    phase:'P1', blocks:'S2.3' },
  { id:'S2.2', epic:'E2', priority:'P0', title:'Client CryptoTransfer with UUID Memo',
    role:'agent developer', want:'Agent Kit to broadcast CryptoTransfer with UUID memo',
    ac:['Destination = server acct, amount = invoice amount, memo = UUID','Broadcasts to Hedera testnet','Returns Hedera Tx ID','Surfaced error on broadcast failure'],
    phase:'P1', blocks:'S2.3' },
  { id:'S3.1', epic:'E3', priority:'P0', title:'Async Mirror Node Query',
    role:'server', want:'async Mirror Node queries for tx validation',
    ac:['asyncio + httpx — never blocks event loop','10s timeout → validation_timeout error','Mirror Node URL in .env (testnet + mainnet)'],
    phase:'P1', blocks:'S3.2' },
  { id:'S3.2', epic:'E3', priority:'P0', title:'Triple-Check Receipt Validation',
    role:'server', want:'three-condition validation on every receipt',
    ac:['Check tx.status == SUCCESS','Check destination + exact amount','Check memo == invoice UUID','All three must pass — failure → 402 not 200','No check detail leaked to client'],
    phase:'P1', blocks:'S2.3' },
  { id:'S2.3', epic:'E2', priority:'P0', title:'Accept Retry + Execute Tool (HTTP 200)',
    role:'agent', want:'retry with payment receipt and get tool result',
    ac:['Valid x402-Payment-Receipt routes to validation','Pass → tool executes → HTTP 200','Fail → HTTP 402 re-issued','Receipt cannot be replayed (UUID consumed)','Tool does not start before validation confirms'],
    phase:'P1', blocks:'Hackathon demo' },
  { id:'S4.1', epic:'E4', priority:'P1', title:'HCS Topic Provisioned',
    role:'tool provider', want:'dedicated HCS topic for audit log',
    ac:['Topic via core_consensus_plugin','ID in .env as HCS_AUDIT_TOPIC_ID','Readable on Hashscan (public)','Server fails to start without topic ID'],
    phase:'P2', blocks:'S4.2' },
  { id:'S4.2', epic:'E4', priority:'P1', title:'Audit Events on Every State Transition',
    role:'judge / auditor', want:'every payment state written to HCS',
    ac:['Events: 402_issued, payment_verified, tool_executed, tool_failed, refund_sent','Each includes: event, uuid, tx_id, tool, amount, timestamp','Fire-and-forget async — tool does not wait for HCS','Write failure logged but does not fail request','Visible on Hashscan within ~5s'],
    phase:'P2', blocks:'S5.3' },
  { id:'S5.1', epic:'E5', priority:'P1', title:'Detect Downstream Failure Post-Payment',
    role:'server', want:'detect proxied tool failure after payment verified',
    ac:['Failure = HTTP 4xx/5xx from upstream or 15s timeout','Detection only fires after payment_verified','Logs failure type: upstream_error | upstream_timeout','Does not trigger on bad client input (400)'],
    phase:'P2', blocks:'S5.2' },
  { id:'S5.2', epic:'E5', priority:'P1', title:'Async Refund via CryptoTransfer',
    role:'agent', want:'HBAR auto-returned when tool fails after payment',
    ac:['Refund dispatched within 5s of failure','Amount = exact amount paid','Async — does not block HTTP 503 response','503 body includes refund_status + refund_tx_id','Refund failure → HCS refund_failed, not silent drop'],
    phase:'P2', blocks:'S5.3' },
  { id:'S5.3', epic:'E5', priority:'P1', title:'HCS Logged Before + After Refund',
    role:'auditor', want:'failure and refund events written to HCS in sequence',
    ac:['tool_failed written before refund dispatched','refund_sent written after Tx ID known','Both reference same uuid + original tx_id','Sequence on Hashscan: tool_failed before refund_sent'],
    phase:'P2', blocks:'—' },
  { id:'S6.1', epic:'E6', priority:'P2', title:'Server Detects Allowance Header',
    role:'agent', want:'signal pre-approved allowance to skip 402 challenge',
    ac:['x-allowance: true triggers allowance path','Verify allowance exists + sufficient before tool','Insufficient → 402 "allowance_insufficient"','None found → 402 "allowance_not_found"'],
    phase:'P3', blocks:'S6.2' },
  { id:'S6.2', epic:'E6', priority:'P2', title:'Pull Payment via Allowance Tool',
    role:'server', want:'pull payment from pre-approved allowance without interrupting agent loop',
    ac:['TRANSFER_HBAR_WITH_ALLOWANCE_TOOL called server-side','Payment before tool execution','HCS payment_verified written (same schema)','Transfer < 2s','Tool only runs after pull confirmed'],
    phase:'P3', blocks:'—' },
  { id:'S7.1', epic:'E7', priority:'P2', title:'Config-Driven Tool Registry',
    role:'tool provider', want:'register tools via config not code',
    ac:['Tools in tools.yaml: name, description, price_hbar, upstream_url, env_key','Registry loads at startup','New tool in config + restart = discoverable','Removed tool → 404, not crash'],
    phase:'P3', blocks:'S7.2, S7.3' },
  { id:'S7.3', epic:'E7', priority:'P0', title:'Per-Invoice Price Validation in Refund Path',
    role:'developer using a multi-priced tool', want:'refund calculation to use the price actually charged',
    ac:['price_hbar in config drives x402-Invoice-Amount','Invoice reflects specific tool — not flat server-wide rate','receipt.py:51 reads pending_entry["amount_hbar"] not settings["TOOL_PRICE_HBAR"]','TOOL_PRICE_HBAR retired from config.py + all 5 reference sites','Tool at 0.5 HBAR and tool at 2 HBAR refund at their own price','Existing refund flow (HCS tool_failed before dispatch) unchanged'],
    phase:'P3', blocks:'—' },
  { id:'S7.4', epic:'E7', priority:'P0', title:'Non-Blocking Tool Execution (Thread Pool)',
    role:'developer using the x402 proxy', want:'server to handle concurrent tool calls without stalling',
    ac:['Blocking code-analysis scan runs via asyncio.run_in_executor — not on event loop','Second concurrent request begins immediately while scan runs — no queue stall','Thread pool is bounded — unbounded threads not acceptable','Non-blocking endpoint response time unaffected during scan','Existing tool response schema unchanged'],
    phase:'P3', blocks:'—' },
  { id:'S7.5', epic:'E7', priority:'P0', title:'Mirror Node-Backed Replay Protection',
    role:'tool provider', want:'receipt replay detection to survive server restarts',
    ac:['In-memory used_invoices set removed as sole replay guard','Mirror Node queried for prior confirmed txs with matching UUID memo on every validation','>=1 confirmed match (not current tx) → 402 / duplicate_invoice','Mirror Node query failure → fail closed (receipt rejected, not accepted)','Server restart + resubmit of used receipt → rejected correctly','Mirror Node query async (httpx) — does not block event loop','Existing triple-check preserved — this is an additional check'],
    phase:'P3', blocks:'—' },
  { id:'S7.2', epic:'E7', priority:'P2', title:'OCR Extraction Tool',
    role:'agent developer', want:'a second registered tool (OCR extraction)',
    ac:['Tool: ocr-extract','Accepts { file_url, output_format }','Returns text/structured data from upstream OCR API','Different .env key to code analysis tool'],
    phase:'P3', blocks:'—' },
  { id:'S9.1', epic:'E9', priority:'P2', title:'Hashscan Transaction Links in Simulation Log',
    role:'demo viewer / judge', want:'to click through from a simulation log entry to the actual Hedera transaction on Hashscan',
    ac:['[⬡ View Tx on Hashscan] link appears inline on the CryptoTransfer broadcast log line','Link opens hashscan.io/testnet/transaction/{tx_id} in a new tab','Backend emits hashscan_tx_url in SSE event detail; frontend extracts and renders it','Link only appears on the log line that carries the tx_id'],
    phase:'P2', blocks:'—' },
  { id:'S9.2', epic:'E9', priority:'P2', title:'HCS Audit Topic Deep-Link in Simulation Panel',
    role:'judge / auditor', want:'a permanent link to the HCS audit topic visible before and during simulation',
    ac:['[⬡ HCS Audit Topic] link in header when server is live','Link opens hashscan.io/testnet/topic/{HCS_AUDIT_TOPIC_ID} in a new tab','Derived from serverStatus.hashscan_topic in /demo/status response','[⬡ View HCS Audit on Hashscan] also appears inline on HCS log events','Header link absent when server is offline'],
    phase:'P2', blocks:'—' },
  { id:'S8.1', epic:'E8', priority:'P3', title:'Mainnet Authorization Prompt',
    role:'developer on mainnet', want:'agent to confirm before spending real HBAR',
    ac:['mainnet: prompts "Authorize X HBAR? (y/n)"','Pauses until y input','n → clean cancel, no broadcast','testnet: gate bypassed automatically'],
    phase:'P4', blocks:'—' },
];

const STORY_MAP = Object.fromEntries(ALL_STORIES.map(s => [s.id, s]));

function buildClaudePrompt(story) {
  return `Implement story ${story.id}: ${story.title}

User Story:
As a ${story.role}, I want ${story.want}.

Acceptance Criteria:
${story.ac.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Epic: ${story.epic} | Priority: ${story.priority} | Phase: ${story.phase}
Blocks: ${story.blocks}

Please implement this story now, following the architecture in /architecture/ARCHITECTURE.md.`;
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today ' + formatTime(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + formatTime(iso);
}

const STATUS_ICON = { backlog: '○', inprogress: '◑', review: '◕', done: '●', blocked: '✕' };
const STATUS_COLOR = { backlog: C.muted, inprogress: C.amber, review: C.indigo, done: C.green, blocked: C.red };

function StoryCard({ story, onDragStart, onDragEnd, isDragging, colId }) {
  const { getStatus, setStatus } = useStore();
  const { navigate } = useNav();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const status = getStatus(story.id);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(buildClaudePrompt(story)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleGoToBacklog = (e) => {
    e.stopPropagation();
    navigate('backlog', { storyId: story.id });
  };

  const handleAdvance = (e) => {
    e.stopPropagation();
    const next = STATUS_NEXT[status];
    if (next !== status) setStatus(story.id, story.title, next);
  };

  const handleBlock = (e) => {
    e.stopPropagation();
    setStatus(story.id, story.title, status === 'blocked' ? 'backlog' : 'blocked');
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => setExpanded(e => !e)}
      style={{
        backgroundColor: isDragging ? '#1e2d45' : C.card,
        border: `1px solid ${isDragging ? C.cyan + '66' : C.border}`,
        borderLeft: `3px solid ${EPIC_CLR[story.epic]}`,
        borderRadius: 8,
        padding: '10px 12px',
        cursor: 'grab',
        marginBottom: 8,
        opacity: isDragging ? 0.4 : 1,
        transition: 'all 0.12s',
        userSelect: 'none',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <span style={{ backgroundColor: P_COLOR[story.priority] + '22', color: P_COLOR[story.priority], padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}>{story.priority}</span>
          <span style={{ backgroundColor: EPIC_CLR[story.epic] + '22', color: EPIC_CLR[story.epic], padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}>{story.epic}</span>
          <span style={{ color: C.muted, fontSize: 10, fontFamily: 'monospace' }}>{story.id}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button title="View full story details in Backlog" onClick={handleGoToBacklog} style={{ padding: '2px 6px', borderRadius: 3, border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 10, fontFamily: 'monospace' }}>
            details →
          </button>
          <button title="Copy Claude Code prompt" onClick={handleCopy} style={{ padding: '2px 6px', borderRadius: 3, border: `1px solid ${C.border}`, backgroundColor: copied ? C.green + '22' : 'transparent', color: copied ? C.green : C.muted, cursor: 'pointer', fontSize: 10, fontFamily: 'monospace' }}>
            {copied ? '✓' : '⊂'}
          </button>
        </div>
      </div>

      {/* Title */}
      <div style={{ color: C.text, fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 4 }}>{story.title}</div>

      {/* Expanded AC */}
      {expanded && (
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <div style={{ color: C.muted, fontSize: 10, fontFamily: 'monospace', marginBottom: 4 }}>ACCEPTANCE CRITERIA</div>
          {story.ac.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-start' }}>
              <span style={{ color: status === 'done' ? C.green : C.border, fontSize: 11, marginTop: 1, flexShrink: 0 }}>{status === 'done' ? '✓' : '○'}</span>
              <span style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.5 }}>{a}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
        {status !== 'done' && (
          <button onClick={handleAdvance} style={{ flex: 1, padding: '4px 0', borderRadius: 3, border: 'none', backgroundColor: STATUS_COLOR[status] + '22', color: STATUS_COLOR[status], cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
            {STATUS_LABEL[status]}
          </button>
        )}
        {status === 'done' && (
          <div style={{ flex: 1, textAlign: 'center', padding: '4px 0', color: C.green, fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>✓ Complete</div>
        )}
        {status !== 'done' && status !== 'blocked' && (
          <button onClick={handleBlock} title="Mark Blocked" style={{ padding: '4px 7px', borderRadius: 3, border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 11 }}>⊘</button>
        )}
        {status === 'blocked' && (
          <button onClick={handleBlock} style={{ padding: '4px 7px', borderRadius: 3, border: `1px solid ${C.red}44`, backgroundColor: C.red + '11', color: C.red, cursor: 'pointer', fontSize: 11 }}>unblock</button>
        )}
      </div>
    </div>
  );
}

function Column({ col, storyIds, dragOver, onDragOver, onDragLeave, onDrop }) {
  const stories = storyIds.map(id => STORY_MAP[id]).filter(Boolean);
  const isTarget = dragOver === col.id;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        width: 220,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: isTarget ? col.color + '11' : 'transparent',
        border: `1px solid ${isTarget ? col.color + '55' : C.border}`,
        borderRadius: 10,
        transition: 'all 0.12s',
        overflow: 'hidden',
      }}
    >
      {/* Column header */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, backgroundColor: col.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: col.color, fontSize: 14 }}>{STATUS_ICON[col.id]}</span>
          <span style={{ color: col.color, fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{col.label}</span>
        </div>
        <span style={{ backgroundColor: col.color + '22', color: col.color, padding: '1px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{stories.length}</span>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', minHeight: 80 }}>
        {stories.length === 0 && (
          <div style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace', textAlign: 'center', paddingTop: 20, opacity: 0.5 }}>
            {isTarget ? 'Drop here' : 'Empty'}
          </div>
        )}
        {stories.map(story => (
          <DraggableCard key={story.id} story={story} colId={col.id} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ story, colId }) {
  const { setStatus } = useStore();
  const [isDragging, setIsDragging] = useState(false);

  return (
    <StoryCard
      story={story}
      colId={colId}
      isDragging={isDragging}
      onDragStart={(e) => {
        e.dataTransfer.setData('storyId', story.id);
        e.dataTransfer.setData('storyTitle', story.title);
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
    />
  );
}

function ActivityFeed({ log }) {
  if (log.length === 0) return (
    <div style={{ color: C.muted, fontSize: 12, fontFamily: 'monospace', textAlign: 'center', paddingTop: 40, opacity: 0.5 }}>
      No activity yet.<br />Move a card to start.
    </div>
  );

  return (
    <div>
      {log.slice(0, 50).map(entry => (
        <div key={entry.id} style={{ padding: '9px 0', borderBottom: `1px solid ${C.border}22`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 8, height: 8, borderRadius: '50%', backgroundColor: STATUS_COLOR[entry.to] ?? C.muted, marginTop: 5, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontSize: 12, lineHeight: 1.4 }}>{entry.title}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
              <span style={{ color: STATUS_COLOR[entry.from], fontSize: 10, fontFamily: 'monospace' }}>{entry.from}</span>
              <span style={{ color: C.muted, fontSize: 10 }}>→</span>
              <span style={{ color: STATUS_COLOR[entry.to], fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>{entry.to}</span>
            </div>
          </div>
          <div style={{ color: C.muted, fontSize: 10, fontFamily: 'monospace', flexShrink: 0 }}>{formatDate(entry.ts)}</div>
        </div>
      ))}
    </div>
  );
}

const PHASES = [
  { id: 'P1', label: 'Phase 1 — MVP Core',          color: C.red,    ids: ['S1.1','S1.2','S1.3','S2.1','S2.2','S3.1','S3.2','S2.3'] },
  { id: 'P2', label: 'Phase 2 — Hackathon Complete', color: C.amber,  ids: ['S4.1','S4.2','S5.1','S5.2','S5.3','S9.1','S9.2'] },
  { id: 'P3', label: 'Phase 3 — Differentiator',     color: C.cyan,   ids: ['S6.1','S6.2','S7.1','S7.3','S7.2','S7.4','S7.5'] },
  { id: 'P4', label: 'Phase 4 — Post-Hackathon',     color: C.purple, ids: ['S8.1'] },
];

function PhaseProgressBar({ phase }) {
  const { phaseProgress } = useStore();
  const p = phaseProgress(phase.ids);
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: phase.color, fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>{phase.label}</span>
        <span style={{ color: C.muted, fontSize: 10, fontFamily: 'monospace' }}>{p.done}/{p.total}</span>
      </div>
      <div style={{ height: 4, backgroundColor: '#1e2d45', borderRadius: 2 }}>
        <div style={{ height: 4, backgroundColor: p.pct === 100 ? C.green : phase.color, borderRadius: 2, width: `${p.pct}%`, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

export default function KanbanView() {
  const { storiesByStatus, setStatus, log, resetAll } = useStore();
  const { navigate } = useNav();
  const [dragOver, setDragOver]       = useState(null);
  const [filterPhase, setFilterPhase] = useState('ALL');
  const [filterEpic, setFilterEpic]   = useState('ALL');
  const dragIdRef = useRef(null);

  // Epics available for the current phase selection
  const visibleEpics = PHASE_EPICS[filterPhase] ?? PHASE_EPICS.ALL;

  // Reset epic filter when it's no longer valid for the new phase
  const handlePhaseChange = (p) => {
    setFilterPhase(p);
    const allowed = PHASE_EPICS[p] ?? PHASE_EPICS.ALL;
    if (filterEpic !== 'ALL' && !allowed.includes(filterEpic)) {
      setFilterEpic('ALL');
    }
  };

  const filteredIds = ALL_STORIES
    .filter(s => filterPhase === 'ALL' || s.phase === filterPhase)
    .filter(s => filterEpic  === 'ALL' || s.epic  === filterEpic)
    .map(s => s.id);

  const buckets = storiesByStatus(filteredIds);

  const handleDragOver = (colId) => (e) => {
    e.preventDefault();
    setDragOver(colId);
  };

  const handleDrop = (colId) => (e) => {
    e.preventDefault();
    const id    = e.dataTransfer.getData('storyId');
    const title = e.dataTransfer.getData('storyTitle');
    if (id) setStatus(id, title, colId);
    setDragOver(null);
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', backgroundColor: C.bg, fontFamily: 'system-ui, sans-serif' }}>

      {/* Left sidebar */}
      <div style={{ width: 210, flexShrink: 0, borderRight: `1px solid ${C.border}`, backgroundColor: C.sidebar, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 8 }}>SPRINT PROGRESS</div>
          {PHASES.map(p => <PhaseProgressBar key={p.id} phase={p} />)}
        </div>

        {/* Phase filter */}
        <div style={{ padding: '12px 14px 8px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 6 }}>PHASE</div>
          {['ALL', 'P1', 'P2', 'P3', 'P4'].map(p => (
            <button key={p} onClick={() => handlePhaseChange(p)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: filterPhase === p ? '#1e2d45' : 'transparent', color: filterPhase === p ? C.cyan : C.muted, fontSize: 12, fontFamily: 'monospace', marginBottom: 2 }}>
              {p === 'ALL' ? 'All Phases' : p}
            </button>
          ))}
        </div>

        {/* Epic filter — dynamic, only shows epics for the selected phase */}
        <div style={{ padding: '12px 14px 8px', borderBottom: `1px solid ${C.border}`, flex: 1, overflowY: 'auto' }}>
          <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 6 }}>EPIC</div>
          <button onClick={() => setFilterEpic('ALL')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: filterEpic === 'ALL' ? '#1e2d45' : 'transparent', color: filterEpic === 'ALL' ? C.cyan : C.muted, fontSize: 12, fontFamily: 'monospace', marginBottom: 2 }}>
            All Epics
          </button>
          {visibleEpics.map(e => (
            <div key={e} style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
              <button onClick={() => setFilterEpic(e)} style={{
                flex: 1, textAlign: 'left', padding: '5px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
                backgroundColor: filterEpic === e ? '#1e2d45' : 'transparent',
                color: filterEpic === e ? EPIC_CLR[e] : C.muted,
                fontSize: 12, fontFamily: 'monospace',
              }}>
                <span style={{ color: EPIC_CLR[e], fontWeight: 700 }}>{e}</span>
                <span style={{ color: C.muted, fontSize: 10, marginLeft: 5 }}>{EPIC_LABELS[e]}</span>
              </button>
              {/* Navigate to this epic's phase in Roadmap */}
              <button
                title={`View ${e} in Roadmap`}
                onClick={() => navigate('roadmap', { phaseId: EPIC_TO_PHASE[e] })}
                style={{ padding: '2px 5px', border: 'none', backgroundColor: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 10, fontFamily: 'monospace', flexShrink: 0 }}
              >
                ↗
              </button>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 14px' }}>
          <button onClick={() => { if (confirm('Reset all story statuses and activity log?')) resetAll(); }} style={{ width: '100%', padding: '6px', borderRadius: 4, border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>Reset Board</button>
        </div>
      </div>

      {/* Kanban columns */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 12px', display: 'flex', gap: 10 }}>
        {COLUMNS.map(col => (
          <Column
            key={col.id}
            col={col}
            storyIds={buckets[col.id] ?? []}
            dragOver={dragOver}
            onDragOver={handleDragOver(col.id)}
            onDragLeave={() => setDragOver(null)}
            onDrop={handleDrop(col.id)}
          />
        ))}
      </div>

      {/* Right — Activity feed */}
      <div style={{ width: 240, flexShrink: 0, borderLeft: `1px solid ${C.border}`, backgroundColor: C.sidebar, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: C.muted, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em' }}>ACTIVITY</span>
          <span style={{ backgroundColor: '#1e2d45', color: C.muted, padding: '1px 7px', borderRadius: 99, fontSize: 10 }}>{log.length}</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px' }}>
          <ActivityFeed log={log} />
        </div>
      </div>
    </div>
  );
}
