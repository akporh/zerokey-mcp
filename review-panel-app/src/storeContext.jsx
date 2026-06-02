import { createContext, useContext } from 'react';
import { useBacklogStore } from './useBacklogStore';

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const store = useBacklogStore();
  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
