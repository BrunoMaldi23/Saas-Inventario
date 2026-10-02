import { useCallback, useEffect, useState } from 'react';
import { getApiHealth, getDatabaseHealth } from '@inventario/api-client';

export type ServiceStatus = 'checking' | 'online' | 'offline';

export type SystemHealth = {
  api: ServiceStatus;
  database: ServiceStatus;
  checkedAt: Date | null;
  refresh: () => void;
};

async function check(
  request: () => Promise<{ status: string }>,
): Promise<Exclude<ServiceStatus, 'checking'>> {
  try {
    const response = await request();
    return response.status === 'ok' ? 'online' : 'offline';
  } catch {
    return 'offline';
  }
}

/** Verifica Frontend → API → Database usando el cliente API compartido. */
export function useSystemHealth(): SystemHealth {
  const [api, setApi] = useState<ServiceStatus>('checking');
  const [database, setDatabase] = useState<ServiceStatus>('checking');
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([check(getApiHealth), check(getDatabaseHealth)]).then(
      ([apiStatus, databaseStatus]) => {
        if (!active) return;
        setApi(apiStatus);
        setDatabase(databaseStatus);
        setCheckedAt(new Date());
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const refresh = useCallback(() => {
    setApi('checking');
    setDatabase('checking');
    setAttempt((n) => n + 1);
  }, []);

  return { api, database, checkedAt, refresh };
}
