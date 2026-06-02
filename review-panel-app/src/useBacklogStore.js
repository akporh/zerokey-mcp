import { useState, useCallback } from 'react';

const STORAGE_KEY = 'hedera_backlog_v1';

const DEFAULT_STATUS = {};
const DEFAULT_LOG    = [];
const DEFAULT_NOTES  = {};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { statuses: DEFAULT_STATUS, log: DEFAULT_LOG, notes: DEFAULT_NOTES };
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
