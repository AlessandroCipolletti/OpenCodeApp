'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AppNav } from '@/components/AppNav';

interface Release {
  id: string;
  version: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

function HistoryPageContent() {
  const searchParams = useSearchParams();
  const tenant = searchParams.get('tenant') ?? 'tenant-1';
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState<string | null>(null);

  const fetchReleases = useCallback(async () => {
    const res = await fetch(`${API}/api/releases?tenant=${tenant}`);
    if (res.ok) setReleases(await res.json());
    setLoading(false);
  }, [tenant, API]);

  useEffect(() => { fetchReleases(); }, [fetchReleases]);

  const rollback = async (id: string, version: number) => {
    if (!confirm(`Roll back to v${version}?`)) return;
    setRolling(id);
    await fetch(`${API}/api/releases/${id}/rollback?tenant=${tenant}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Manual rollback from UI' }),
    });
    setRolling(null);
    fetchReleases();
  };

  return (
    <main>
      <AppNav tenant={tenant} active="history" />
      <div className="container">
        <h2>Release History</h2>
        {loading ? (
          <p>Loading...</p>
        ) : releases.length === 0 ? (
          <div className="card">
            <p style={{ color: '#64748b' }}>No releases yet. Use the AI assistant to make changes.</p>
          </div>
        ) : (
          releases.map(release => (
            <div key={release.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <strong>v{release.version}</strong>
                  {release.isActive && <span className="badge badge-green">Active</span>}
                </div>
                <p style={{ color: '#64748b', margin: '0.25rem 0' }}>{release.description ?? 'No description'}</p>
                <small style={{ color: '#94a3b8' }}>{new Date(release.createdAt).toLocaleString()}</small>
              </div>
              {!release.isActive && (
                <button
                  onClick={() => rollback(release.id, release.version)}
                  disabled={rolling === release.id}
                  className="btn-secondary"
                  style={{ flexShrink: 0 }}
                >
                  {rolling === release.id ? 'Rolling back...' : 'Rollback'}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}

export default function HistoryPage() {
  return (
    <Suspense>
      <HistoryPageContent />
    </Suspense>
  );
}
