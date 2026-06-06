import { useState, useEffect } from 'react';
import { useStore } from './storeContext';

const C = {
  bg: '#0a0f1e', card: '#111827', sidebar: '#0d1526',
  border: '#1e2d45', text: '#e2e8f0', muted: '#64748b',
  cyan: '#38bdf8', green: '#10b981', amber: '#f59e0b',
  red: '#ef4444', purple: '#a855f7', indigo: '#6366f1',
  teal: '#14b8a6',
};

const PHASES = [
  {
    id: 'P1',
    label: 'Phase 1',
    title: 'MVP Core',
    subtitle: 'Working x402 demo — end to end on testnet',
    color: C.red,
    goal: 'An AI agent can call a premium tool with zero pre-registered API keys — proven on Hedera testnet.',
    stories: [
      { id: 'S1.1', title: 'Runnable FastAPI + MCP Server', epic: 'E1' },
      { id: 'S1.2', title: 'Credential Vault (.env)',        epic: 'E1' },
      { id: 'S1.3', title: 'First Tool: Static Code Analysis', epic: 'E1' },
      { id: 'S2.1', title: 'x402 Middleware — Issue 402',    epic: 'E2' },
      { id: 'S2.2', title: 'Client CryptoTransfer + UUID Memo', epic: 'E2' },
      { id: 'S3.1', title: 'Async Mirror Node Query',        epic: 'E3' },
      { id: 'S3.2', title: 'Triple-Check Receipt Validation', epic: 'E3' },
      { id: 'S2.3', title: 'Accept Retry + Execute Tool',    epic: 'E2' },
    ],
    outcomes: ['O1', 'O2', 'O6'],
    deliverable: 'Live demo: agent sends request → receives 402 → pays HBAR → retries → gets code analysis result. Verifiable on Hedera testnet.',
  },
  {
    id: 'P2',
    label: 'Phase 2',
    title: 'Hackathon Complete',
    subtitle: 'HCS audit trail + financial safety — rubric fully satisfied',
    color: C.amber,
    goal: 'Judges can verify every payment interaction on Hashscan. Agent funds are protected from upstream failures.',
    stories: [
      { id: 'S4.1', title: 'HCS Topic Provisioned',          epic: 'E4' },
      { id: 'S4.2', title: 'Audit Events on Every Transition', epic: 'E4' },
      { id: 'S5.1', title: 'Detect Downstream Failure',       epic: 'E5' },
      { id: 'S5.2', title: 'Async Refund via CryptoTransfer', epic: 'E5' },
      { id: 'S5.3', title: 'HCS Logged Before + After Refund', epic: 'E5' },
      { id: 'S9.1', title: 'Hashscan Tx Links in Simulation Log', epic: 'E9' },
      { id: 'S9.2', title: 'HCS Audit Topic Deep-Link in Panel', epic: 'E9' },
    ],
    outcomes: ['O3', 'O4'],
    deliverable: 'Hashscan shows live sequence: 402_issued → payment_verified → tool_executed. Simulation panel links directly to each transaction and the HCS audit topic. Downstream failure triggers automatic HBAR refund with HCS evidence.',
  },
  {
    id: 'P3',
    label: 'Phase 3',
    title: 'Differentiator',
    subtitle: 'Allowance mode + multi-tool — standout submission',
    color: C.cyan,
    goal: 'Iterative agent workloads run at full speed. Multiple tools available from a single config-driven registry.',
    stories: [
      { id: 'S6.1', title: 'Server Detects Allowance Header', epic: 'E6' },
      { id: 'S6.2', title: 'Pull Payment via Allowance Tool', epic: 'E6' },
      { id: 'S7.1', title: 'Config-Driven Tool Registry',     epic: 'E7' },
      { id: 'S7.3', title: 'Per-Invoice Price Validation (Refund Fix)', epic: 'E7' },
      { id: 'S7.2', title: 'OCR Extraction Tool',             epic: 'E7' },
      { id: 'S7.4', title: 'Non-Blocking Tool Execution (Thread Pool)', epic: 'E7' },
      { id: 'S7.5', title: 'Mirror Node-Backed Replay Protection', epic: 'E7' },
    ],
    outcomes: ['O5'],
    deliverable: 'Agent pre-approves 20 HBAR allowance. 10 back-to-back tool calls complete with zero 402 interrupts. Two distinct tools available from config. Concurrent users no longer stall the server. Replay attack protection survives server restart.',
  },
  {
    id: 'P4',
    label: 'Phase 4',
    title: 'Demo Ready',
    subtitle: 'Installable MCP — judge runs the demo in 2 minutes',
    color: C.green,
    goal: 'Any developer installs ZeroKey as an MCP server in Claude Desktop via one config block. Agent pays per call in HBAR. No API keys. No shim. End-to-end demo that proves the thesis.',
    stories: [
      { id: 'S10.1', title: 'MCP Server Entry Point',                   epic: 'E10' },
      { id: 'S10.2', title: 'scan_code Tool with x402 Payment Flow',    epic: 'E10' },
      { id: 'S10.3', title: 'Wallet Config via MCP Config Block',       epic: 'E10' },
      { id: 'S10.4', title: 'Claude Desktop Installation Config',       epic: 'E10' },
      { id: 'S10.5', title: 'End-to-End Demo Script (DEMO.md)',         epic: 'E10' },
    ],
    outcomes: ['O1', 'O7'],
    deliverable: 'Judge clones repo, adds 3 env values to claude_desktop_config.json, restarts Claude Desktop. Asks Claude to scan code. ZeroKey pays 0.5 HBAR, returns findings. HCS audit trail verifiable on Hashscan. Zero API keys configured.',
  },
  {
    id: 'P5',
    label: 'Phase 5',
    title: 'Post-Hackathon',
    subtitle: 'Mainnet safety + production hardening',
    color: C.purple,
    goal: 'System is safe to run on Hedera mainnet with real HBAR. Human approval gate prevents accidental spend.',
    stories: [
      { id: 'S8.1', title: 'Mainnet Authorization Prompt',    epic: 'E8' },
    ],
    outcomes: [],
    deliverable: 'Mainnet deployment with human-in-the-loop confirmation before any real HBAR payment. Testnet path unchanged.',
    future: true,
  },
];

const OUTCOME_META = {
  O1: { label: 'Zero-Key Access',   color: C.cyan },
  O2: { label: 'On-Chain Verified', color: C.green },
  O3: { label: 'Audit Trail',       color: C.purple },
  O4: { label: 'Funds Protected',   color: C.amber },
  O5: { label: 'Loop Uninterrupted',color: C.indigo },
  O6: { label: 'Creds Never Exposed',color: C.red },
  O7: { label: 'Installable in Minutes', color: C.teal },
};

const EPIC_COLORS = { E1: C.red, E2: C.red, E3: C.red, E4: C.amber, E5: C.amber, E6: C.cyan, E7: C.cyan, E8: C.purple, E9: C.teal, E10: C.green };

function OutcomePill({ id }) {
  const m = OUTCOME_META[id];
  return <span style={{ backgroundColor: m.color + '22', color: m.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: 'monospace', marginRight: 4 }}>{id} {m.label}</span>;
}

function StoryChip({ id, title, epic }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', backgroundColor: '#0d1526', borderRadius: 6, marginBottom: 5, border: `1px solid ${C.border}` }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: EPIC_COLORS[epic], flexShrink: 0 }} />
      <span style={{ color: C.muted, fontSize: 10, fontFamily: 'monospace', flexShrink: 0 }}>{id}</span>
      <span style={{ color: '#94a3b8', fontSize: 12 }}>{title}</span>
    </div>
  );
}

function GanttView() {
  const cols = PHASES.length;
  const { phaseProgress } = useStore();

  return (
    <div style={{ padding: '24px 32px', overflowX: 'auto' }}>
      <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 16 }}>DELIVERY TIMELINE — PHASES</div>

      {/* Phase headers */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, marginBottom: 8 }}>
        {PHASES.map(p => (
          <div key={p.id} style={{ backgroundColor: p.color + '22', border: `1px solid ${p.color}44`, borderRadius: 6, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ color: p.color, fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{p.label}</div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 13, marginTop: 2 }}>{p.title}</div>
          </div>
        ))}
      </div>

      {/* Epic rows */}
      {['E1','E2','E3','E4','E5','E6','E7','E8','E9','E10'].map(epicId => {
        const epicLabels = { E1: 'MCP Foundation', E2: 'x402 Rail', E3: 'Validation', E4: 'HCS Audit', E5: 'Refund Hook', E6: 'Allowance Mode', E7: 'Tool Registry', E8: 'Mainnet Gate', E9: 'Demo Observability', E10: 'MCP Client Wrapper' };
        const epicPhase = { E1: 0, E2: 0, E3: 0, E4: 1, E5: 1, E6: 2, E7: 2, E8: 4, E9: 1, E10: 3 };
        const col = epicPhase[epicId];
        const color = EPIC_COLORS[epicId];

        return (
          <div key={epicId} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, marginBottom: 5 }}>
            {PHASES.map((p, i) => (
              <div key={p.id} style={{
                height: 32, borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 10,
                backgroundColor: i === col ? color + '22' : '#0d1526',
                border: `1px solid ${i === col ? color + '55' : C.border}`,
              }}>
                {i === col && (
                  <>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color, marginRight: 8, flexShrink: 0 }} />
                    <span style={{ color, fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>{epicId}</span>
                    <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 6 }}>{epicLabels[epicId]}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {/* Live progress row */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, marginTop: 14 }}>
        {PHASES.map(p => {
          const prog = phaseProgress(p.stories.map(s => s.id));
          const complete = prog.pct === 100;
          return (
            <div key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: complete ? C.green : C.muted, fontSize: 10, fontFamily: 'monospace', fontWeight: complete ? 700 : 400 }}>
                  {complete ? '✓ done' : `${prog.done}/${prog.total}`}
                </span>
                <span style={{ color: complete ? C.green : p.color, fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>
                  {prog.pct}%
                </span>
              </div>
              <div style={{ height: 5, backgroundColor: '#1e2d45', borderRadius: 3 }}>
                <div style={{
                  height: 5, borderRadius: 3,
                  backgroundColor: complete ? C.green : p.color,
                  width: `${prog.pct}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RoadmapView({ jumpToPhase }) {
  const [activePhase, setActivePhase] = useState('P1');
  const [view, setView] = useState('board');
  const { phaseProgress } = useStore();
  const phase = PHASES.find(p => p.id === activePhase);

  useEffect(() => {
    if (jumpToPhase && PHASES.find(p => p.id === jumpToPhase)) {
      setActivePhase(jumpToPhase);
      setView('board');
    }
  }, [jumpToPhase]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: C.bg, fontFamily: 'system-ui, sans-serif' }}>

      {/* Top controls */}
      <div style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.sidebar, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex' }}>
          {PHASES.map(p => (
            <button key={p.id} onClick={() => { setActivePhase(p.id); setView('board'); }} style={{
              padding: '12px 16px', border: 'none', cursor: 'pointer', fontFamily: 'monospace',
              backgroundColor: 'transparent', transition: 'all 0.12s',
              color: activePhase === p.id ? p.color : C.muted,
              borderBottom: `2px solid ${activePhase === p.id ? p.color : 'transparent'}`,
              fontSize: 12, fontWeight: activePhase === p.id ? 700 : 400,
            }}>
              {p.label} — {p.title}
            </button>
          ))}
        </div>
        <button onClick={() => setView(v => v === 'gantt' ? 'board' : 'gantt')} style={{
          padding: '6px 14px', border: `1px solid ${C.border}`, borderRadius: 4,
          backgroundColor: view === 'gantt' ? '#1e2d45' : 'transparent',
          color: view === 'gantt' ? C.cyan : C.muted, cursor: 'pointer', fontSize: 11,
          fontFamily: 'monospace', fontWeight: 600,
        }}>
          {view === 'gantt' ? '← Board' : 'Timeline →'}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {view === 'gantt' ? (
          <GanttView />
        ) : (
          <div style={{ padding: '28px 32px', maxWidth: 900 }}>

            {/* Phase header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ backgroundColor: phase.color + '22', border: `1px solid ${phase.color}44`, borderRadius: 8, padding: '12px 18px', flexShrink: 0, textAlign: 'center', minWidth: 80 }}>
                <div style={{ color: phase.color, fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{phase.id}</div>
                <div style={{ color: phase.color, fontFamily: 'monospace', fontWeight: 800, fontSize: 18, marginTop: 2 }}>{phase.title}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.muted, fontSize: 13, marginBottom: 6 }}>{phase.subtitle}</div>
                <div style={{ color: C.text, fontSize: 14, lineHeight: 1.6 }}>{phase.goal}</div>
                {phase.future && (
                  <span style={{ display: 'inline-block', marginTop: 8, backgroundColor: C.purple + '22', color: C.purple, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>POST-HACKATHON</span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

              {/* Stories */}
              <div>
                <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 10 }}>STORIES IN THIS PHASE — {phase.stories.length} total</div>
                {phase.stories.map(s => <StoryChip key={s.id} {...s} />)}
              </div>

              {/* Outcomes + Deliverable */}
              <div>
                {phase.outcomes.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 10 }}>OUTCOMES DELIVERED</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {phase.outcomes.map(o => <OutcomePill key={o} id={o} />)}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 10 }}>PHASE DELIVERABLE</div>
                  <div style={{ backgroundColor: C.card, border: `1px solid ${phase.color}33`, borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ color: C.text, fontSize: 13, lineHeight: 1.7 }}>{phase.deliverable}</div>
                  </div>
                </div>

                {/* Progress bar — live from store */}
                {(() => {
                  const p = phaseProgress(phase.stories.map(s => s.id));
                  return (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 8 }}>COMPLETION</div>
                      <div style={{ height: 6, backgroundColor: '#1e2d45', borderRadius: 3 }}>
                        <div style={{ height: 6, backgroundColor: p.pct === 100 ? C.green : phase.color, borderRadius: 3, width: `${p.pct}%`, transition: 'width 0.4s ease' }} />
                      </div>
                      <div style={{ color: p.pct === 100 ? C.green : C.muted, fontSize: 11, fontFamily: 'monospace', marginTop: 4, fontWeight: p.pct === 100 ? 700 : 400 }}>
                        {p.done} / {p.total} stories done{p.pct === 100 ? ' ✓' : ''}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Phase nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
              {PHASES.findIndex(p => p.id === activePhase) > 0 ? (
                <button onClick={() => setActivePhase(PHASES[PHASES.findIndex(p => p.id === activePhase) - 1].id)} style={{ padding: '8px 16px', border: `1px solid ${C.border}`, borderRadius: 4, backgroundColor: 'transparent', color: C.muted, cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>← Previous Phase</button>
              ) : <div />}
              {PHASES.findIndex(p => p.id === activePhase) < PHASES.length - 1 ? (
                <button onClick={() => setActivePhase(PHASES[PHASES.findIndex(p => p.id === activePhase) + 1].id)} style={{ padding: '8px 16px', border: `1px solid ${C.border}`, borderRadius: 4, backgroundColor: 'transparent', color: C.cyan, cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>Next Phase →</button>
              ) : <div />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
