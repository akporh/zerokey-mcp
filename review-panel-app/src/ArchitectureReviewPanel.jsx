
import React, { useState, useEffect, useRef } from 'react';

const SERVER_URL = ''; // proxied by Vite → localhost:8000

const LOG_TYPE_MAP = {
  request: 'system',
  allowance_check: 'auth',
  challenge_402: 'auth',
  verify_tx: 'hedera',
  hcs_log: 'hedera',
  execute_tool: 'tool',
  complete: 'system',
  refund: 'hedera',
  error: 'error',
};

const STEP_MAP = {
  request: 'request',
  allowance_check: 'allowance_check',
  challenge_402: 'challenge_402',
  verify_tx: 'verify_tx',
  hcs_log: 'hcs_log',
  execute_tool: 'execute_tool',
  refund: 'refund',
  complete: 'complete',
};

export default function ArchitectureReviewPanel() {
  const [activeStep, setActiveStep] = useState('idle');
  const [useAllowance, setUseAllowance] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, type: 'system', text: 'FastAPI MCP Proxy server initialized on Port 8000.' },
    { id: 2, type: 'hedera', text: 'Connected to Hedera Testnet. HCS Logging Audit Topic listening.' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [serverStatus, setServerStatus] = useState(undefined);
  const logIdRef = useRef(100);

  const checkServerStatus = () => {
    setServerStatus(undefined);
    fetch(`${SERVER_URL}/demo/status`)
      .then(r => r.json())
      .then(data => setServerStatus(data))
      .catch(() => setServerStatus(null));
  };

  useEffect(() => { checkServerStatus(); }, []);

  const addLog = (type, text, links = []) => {
    const id = logIdRef.current++;
    setLogs(prev => [...prev, { id, type, text: `[${new Date().toLocaleTimeString()}] ${text}`, links }]);
  };

  const startLiveSession = async (inject_failure) => {
    if (isRunning) return;
    setLogs([]);
    setActiveStep('idle');
    setIsRunning(true);

    const mode = useAllowance ? 'allowance' : 'pay_per_call';

    try {
      const response = await fetch(`${SERVER_URL}/demo/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, inject_failure }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            const links = [];
            if (event.detail?.hashscan_tx_url)
              links.push({ label: '⬡ View Tx on Hashscan', url: event.detail.hashscan_tx_url });
            if (event.detail?.hashscan_topic_url)
              links.push({ label: '⬡ View HCS Audit on Hashscan', url: event.detail.hashscan_topic_url });
            addLog(LOG_TYPE_MAP[event.type] || 'system', event.msg, links);
            const step = STEP_MAP[event.type];
            if (step) setActiveStep(step);
          } catch {
            // ignore malformed SSE lines
          }
        }
      }
    } catch (err) {
      addLog('error', `Connection error: ${err.message} — is the server running on port 8000?`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#f8fafc', padding: '24px', fontFamily: 'monospace', borderRadius: '12px', maxWidth: '900px', margin: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #334155', paddingBottom: '12px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#38bdf8' }}>💎 Hedera x402 MCP Proxy Server</h2>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>Week 3 Hackathon Simulation & Architecture Review Console</p>
          {serverStatus && (
            <p style={{ margin: '4px 0 0 0', color: '#10b981', fontSize: '12px' }}>
              ● Live — Agent: {serverStatus.agent_account} | Price: {serverStatus.tool_price_hbar} HBAR
              {' '}
              <a href={serverStatus.hashscan_topic} target="_blank" rel="noopener noreferrer"
                 style={{ color: '#38bdf8', textDecoration: 'none' }}>
                [⬡ HCS Audit Topic]
              </a>
            </p>
          )}
          {serverStatus === null && (
            <p style={{ margin: '4px 0 0 0', color: '#ef4444', fontSize: '12px' }}>
              ● Offline — start server on port 8000{' '}
              <span
                onClick={checkServerStatus}
                style={{ cursor: 'pointer', textDecoration: 'underline', color: '#94a3b8' }}
              >
                [retry]
              </span>
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', padding: '8px 12px', borderRadius: '6px' }}>
          <input
            type="checkbox"
            id="allowance"
            checked={useAllowance}
            onChange={(e) => setUseAllowance(e.target.checked)}
            style={{ cursor: 'pointer' }}
            disabled={isRunning}
          />
          <label htmlFor="allowance" style={{ fontSize: '13px', cursor: 'pointer', color: '#e2e8f0' }}>Enable Native HBAR Allowance Mode</label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div>
          <div style={{ backgroundColor: '#020617', padding: '16px', borderRadius: '8px', minHeight: '320px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
              <div style={{ color: '#64748b', borderBottom: '1px solid #1e293b', paddingBottom: '6px', marginBottom: '8px' }}>⚡ LIVE SERVER LOG OUTPUTS</div>
              {logs.map((log) => (
                <div key={log.id} style={{ marginBottom: '4px' }}>
                  <span style={{
                    color: log.type === 'auth' ? '#f59e0b' : log.type === 'hedera' ? '#10b981' : log.type === 'tool' ? '#a855f7' : log.type === 'error' ? '#ef4444' : '#f8fafc',
                  }}>
                    &gt; {log.text}
                  </span>
                  {log.links?.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" style={{
                      marginLeft: '8px', color: '#38bdf8', fontSize: '11px', textDecoration: 'none',
                    }}>
                      [{link.label}]
                    </a>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                onClick={() => startLiveSession(false)}
                disabled={isRunning}
                style={{
                  flex: 1,
                  backgroundColor: isRunning ? '#0c4a6e' : '#0284c7',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '4px',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {isRunning ? 'Running...' : 'Simulate Successful Pipeline Run'}
              </button>
              <button
                onClick={() => startLiveSession(true)}
                disabled={isRunning}
                style={{
                  flex: 1,
                  backgroundColor: isRunning ? '#450a0a' : '#b91c1c',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '4px',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {isRunning ? 'Running...' : 'Simulate Downstream Failure & Refund'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>ACTIVE ARCHITECTURE STATE</div>
          {[
            { id: 'request', label: '1. Client MCP Request Incoming' },
            { id: 'allowance_check', label: '2. Check Token Allowance Pool' },
            { id: 'challenge_402', label: '3. Dispatched HTTP 402 Challenge' },
            { id: 'verify_tx', label: '4. Hedera Mirror Node Verification' },
            { id: 'hcs_log', label: '5. Immutable Audit Log Posted to HCS' },
            { id: 'execute_tool', label: '6. Protected Backend Tool Running' },
            { id: 'refund', label: '⚠️ Fallback Auto-Refund Initialized' },
            { id: 'complete', label: '✅ Done (Data Payload Streamed)' },
          ].map((step) => {
            const isCurrent = activeStep === step.id;
            return (
              <div key={step.id} style={{
                padding: '10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: isCurrent ? 'bold' : 'normal',
                backgroundColor: isCurrent ? '#0369a1' : '#1e293b',
                color: isCurrent ? '#fff' : '#94a3b8',
                borderLeft: isCurrent ? '4px solid #38bdf8' : '4px solid transparent',
                transition: 'all 0.2s ease'
              }}>
                {step.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
