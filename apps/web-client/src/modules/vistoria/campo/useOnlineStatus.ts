import { useEffect, useState } from 'react';
import { processarFila } from './syncEngine';

/**
 * Reporta o estado online/offline do dispositivo e dispara a sincronização
 * automática da fila ao reconectar (sem Background Sync API — suporte de
 * browser limitado, ver design.md da seção 4).
 */
export function useOnlineStatus(aoSincronizar?: () => void): boolean {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
      processarFila().finally(() => aoSincronizar?.());
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [aoSincronizar]);

  return online;
}
