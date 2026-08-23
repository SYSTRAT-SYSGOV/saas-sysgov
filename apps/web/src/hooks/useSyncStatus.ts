import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export interface SyncStatusHook {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncNow: () => Promise<void>;
}

export function useSyncStatus(tenantId: string): SyncStatusHook {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      await api.get(`/api/siconfi/status?tenantId=${tenantId}`);
      setLastSyncedAt(new Date().toLocaleTimeString('pt-BR'));
    } catch {
    } finally {
      setIsSyncing(false);
    }
  }, [tenantId]);

  return { isSyncing, lastSyncedAt, syncNow };
}
