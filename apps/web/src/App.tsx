import { useEffect, useState } from 'react';
import { getApiHealth, getDatabaseHealth } from '@inventario/api-client';

type Status = 'Checking' | 'Online' | 'Offline';

export function App() {
  const [apiStatus, setApiStatus] = useState<Status>('Checking');
  const [databaseStatus, setDatabaseStatus] = useState<Status>('Checking');

  useEffect(() => {
    let active = true;
    void getApiHealth()
      .then(() => {
        if (active) setApiStatus('Online');
      })
      .catch(() => {
        if (active) setApiStatus('Offline');
      });
    void getDatabaseHealth()
      .then(() => {
        if (active) setDatabaseStatus('Online');
      })
      .catch(() => {
        if (active) setDatabaseStatus('Offline');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="status-card">
      <h1>InventarioSaaS</h1>
      <p>
        Estado API: <strong>{apiStatus}</strong>
      </p>
      <p>
        Estado Database: <strong>{databaseStatus}</strong>
      </p>
    </main>
  );
}
