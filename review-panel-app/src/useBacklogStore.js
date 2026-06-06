import { useState, useCallback } from 'react';

const STORAGE_KEY = 'hedera_backlog_v3';

const DEFAULT_STATUS = {};
const DEFAULT_LOG    = [];
const DEFAULT_NOTES  = {};

const SEED = {
  statuses: {
    'S1.1':'done','S1.2':'review','S1.3':'review',
    'S2.1':'review','S2.2':'review','S2.3':'review',
    'S3.1':'review','S3.2':'review',
    'S4.1':'done','S4.2':'review',
    'S5.1':'review','S5.2':'review','S5.3':'review',
    'S6.1':'review','S6.2':'review',
    'S7.1':'done','S7.2':'done',
    'S9.1':'review','S9.2':'review',
  },
  log: [
    {id:1780661310828.6335,ts:'2026-06-05T12:08:30.828Z',storyId:'S1.1',title:'Runnable FastAPI + MCP Server',from:'review',to:'done',note:''},
    {id:1780661016175.2522,ts:'2026-06-05T12:03:36.175Z',storyId:'S9.2',title:'HCS Audit Topic Deep-Link in Simulation Panel',from:'inprogress',to:'review',note:''},
    {id:1780661014337.8862,ts:'2026-06-05T12:03:34.337Z',storyId:'S9.2',title:'HCS Audit Topic Deep-Link in Simulation Panel',from:'backlog',to:'inprogress',note:''},
    {id:1780661007899.5437,ts:'2026-06-05T12:03:27.899Z',storyId:'S9.1',title:'Hashscan Transaction Links in Simulation Log',from:'inprogress',to:'review',note:''},
    {id:1780661005301.724,ts:'2026-06-05T12:03:25.301Z',storyId:'S9.1',title:'Hashscan Transaction Links in Simulation Log',from:'backlog',to:'inprogress',note:''},
    {id:1780407562615.6653,ts:'2026-06-02T13:39:22.615Z',storyId:'S6.2',title:'Pull Payment via Allowance Tool',from:'inprogress',to:'review',note:''},
    {id:1780407561353.513,ts:'2026-06-02T13:39:21.353Z',storyId:'S6.1',title:'Server Detects Allowance Header',from:'inprogress',to:'review',note:''},
    {id:1780405603877.3918,ts:'2026-06-02T13:06:43.877Z',storyId:'S6.2',title:'Pull Payment via Allowance Tool',from:'backlog',to:'inprogress',note:''},
    {id:1780405453646.1006,ts:'2026-06-02T13:04:13.646Z',storyId:'S6.1',title:'Server Detects Allowance Header',from:'backlog',to:'inprogress',note:''},
    {id:1780403885669.602,ts:'2026-06-02T12:38:05.669Z',storyId:'S5.3',title:'HCS Logged Before + After Refund',from:'inprogress',to:'review',note:''},
    {id:1780403884359.768,ts:'2026-06-02T12:38:04.359Z',storyId:'S5.2',title:'Async Refund via CryptoTransfer',from:'inprogress',to:'review',note:''},
    {id:1780403883463.2087,ts:'2026-06-02T12:38:03.463Z',storyId:'S5.1',title:'Detect Downstream Failure Post-Payment',from:'inprogress',to:'review',note:''},
    {id:1780403881783.1123,ts:'2026-06-02T12:38:01.783Z',storyId:'S4.2',title:'Audit Events on Every State Transition',from:'inprogress',to:'review',note:''},
    {id:1780402359263.0942,ts:'2026-06-02T12:12:39.263Z',storyId:'S5.3',title:'HCS Logged Before + After Refund',from:'backlog',to:'inprogress',note:''},
    {id:1780402329127.3413,ts:'2026-06-02T12:12:09.127Z',storyId:'S5.2',title:'Async Refund via CryptoTransfer',from:'backlog',to:'inprogress',note:''},
    {id:1780402327919.7004,ts:'2026-06-02T12:12:07.919Z',storyId:'S5.1',title:'Detect Downstream Failure Post-Payment',from:'backlog',to:'inprogress',note:''},
    {id:1780402326240.6226,ts:'2026-06-02T12:12:06.240Z',storyId:'S4.2',title:'Audit Events on Every State Transition',from:'backlog',to:'inprogress',note:''},
    {id:1780400730714.5435,ts:'2026-06-02T11:45:30.714Z',storyId:'S2.3',title:'Accept Retry + Execute Tool (HTTP 200)',from:'inprogress',to:'review',note:''},
    {id:1780400729188.809,ts:'2026-06-02T11:45:29.188Z',storyId:'S3.2',title:'Triple-Check Receipt Validation',from:'inprogress',to:'review',note:''},
    {id:1780400720415.7,ts:'2026-06-02T11:45:20.415Z',storyId:'S2.2',title:'Client CryptoTransfer with UUID Memo',from:'inprogress',to:'review',note:''},
    {id:1780400719289.2249,ts:'2026-06-02T11:45:19.289Z',storyId:'S3.1',title:'Async Mirror Node Query',from:'inprogress',to:'review',note:''},
    {id:1780400717429.6392,ts:'2026-06-02T11:45:17.429Z',storyId:'S2.1',title:'x402 Middleware — Issue 402 Challenge',from:'inprogress',to:'review',note:''},
    {id:1780399429433.4294,ts:'2026-06-02T11:23:49.433Z',storyId:'S2.3',title:'Accept Retry + Execute Tool (HTTP 200)',from:'backlog',to:'inprogress',note:''},
    {id:1780399427021.4058,ts:'2026-06-02T11:23:47.021Z',storyId:'S2.2',title:'Client CryptoTransfer with UUID Memo',from:'backlog',to:'inprogress',note:''},
    {id:1780399424922.449,ts:'2026-06-02T11:23:44.922Z',storyId:'S3.2',title:'Triple-Check Receipt Validation',from:'backlog',to:'inprogress',note:''},
    {id:1780399397125.9434,ts:'2026-06-02T11:23:17.125Z',storyId:'S3.1',title:'Async Mirror Node Query',from:'backlog',to:'inprogress',note:''},
    {id:1780399394258.1655,ts:'2026-06-02T11:23:14.258Z',storyId:'S2.1',title:'x402 Middleware — Issue 402 Challenge',from:'backlog',to:'inprogress',note:''},
    {id:1780399393508.2283,ts:'2026-06-02T11:23:13.508Z',storyId:'S1.3',title:'First Tool: Static Code Analysis',from:'inprogress',to:'review',note:''},
    {id:1780397565981.3887,ts:'2026-06-02T10:52:45.981Z',storyId:'S1.2',title:'Credential Vault (server-side .env)',from:'inprogress',to:'review',note:''},
    {id:1780397564100.683,ts:'2026-06-02T10:52:44.100Z',storyId:'S1.1',title:'Runnable FastAPI + MCP Server',from:'inprogress',to:'review',note:''},
    {id:1780397541632.991,ts:'2026-06-02T10:52:21.632Z',storyId:'S1.3',title:'First Tool: Static Code Analysis',from:'backlog',to:'inprogress',note:''},
    {id:1780396768778.874,ts:'2026-06-02T10:39:28.778Z',storyId:'S1.2',title:'Credential Vault (server-side .env)',from:'backlog',to:'inprogress',note:''},
    {id:1780395812031.1135,ts:'2026-06-02T10:23:32.031Z',storyId:'S1.1',title:'Runnable FastAPI + MCP Server',from:'backlog',to:'inprogress',note:''},
  ],
  notes: {},
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      persist(SEED);
      return SEED;
    }
    return JSON.parse(raw);
  } catch {
    return { statuses: DEFAULT_STATUS, log: DEFAULT_LOG, notes: DEFAULT_NOTES };
  }
}

function persist(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export function useBacklogStore() {
  const [state, _setState] = useState(() => load());

  const setState = useCallback((updater) => {
    _setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persist(next);
      return next;
    });
  }, []);

  const getStatus = useCallback((id) => state.statuses[id] ?? 'backlog', [state.statuses]);

  const setStatus = useCallback((id, title, newStatus, note = '') => {
    setState(prev => {
      const prevStatus = prev.statuses[id] ?? 'backlog';
      if (prevStatus === newStatus) return prev;
      const entry = {
        id:      Date.now() + Math.random(),
        ts:      new Date().toISOString(),
        storyId: id,
        title,
        from:    prevStatus,
        to:      newStatus,
        note,
      };
      return {
        ...prev,
        statuses: { ...prev.statuses, [id]: newStatus },
        log:      [entry, ...prev.log].slice(0, 200),
      };
    });
  }, [setState]);

  const setNote = useCallback((id, note) => {
    setState(prev => ({ ...prev, notes: { ...prev.notes, [id]: note } }));
  }, [setState]);

  const resetAll = useCallback(() => {
    const fresh = { statuses: {}, log: [], notes: {} };
    persist(fresh);
    _setState(fresh);
  }, []);

  // Derived helpers
  const storiesByStatus = useCallback((ids) => {
    const buckets = { backlog: [], inprogress: [], review: [], done: [], blocked: [] };
    ids.forEach(id => {
      const s = state.statuses[id] ?? 'backlog';
      buckets[s]?.push(id);
    });
    return buckets;
  }, [state.statuses]);

  const phaseProgress = useCallback((storyIds) => {
    const done = storyIds.filter(id => (state.statuses[id] ?? 'backlog') === 'done').length;
    return { done, total: storyIds.length, pct: storyIds.length ? Math.round((done / storyIds.length) * 100) : 0 };
  }, [state.statuses]);

  return {
    statuses:      state.statuses,
    log:           state.log,
    notes:         state.notes,
    getStatus,
    setStatus,
    setNote,
    storiesByStatus,
    phaseProgress,
    resetAll,
  };
}
