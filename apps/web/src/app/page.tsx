import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <nav>
        <span className="brand">OpenCodeApp</span>
        <Link href="/items?tenant=tenant-1">Items</Link>
        <Link href="/ext/custom-items?tenant=tenant-1">Extension</Link>
        <Link href="/history?tenant=tenant-1">History</Link>
        <Link href="/settings?tenant=tenant-1">Settings</Link>
      </nav>
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h1>Welcome to OpenCodeApp</h1>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>
            A framework for building AI-modifiable web applications.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/items?tenant=tenant-1">
              <button className="btn-primary">View Items</button>
            </Link>
            <Link href="/settings?tenant=tenant-1">
              <button className="btn-secondary">Configure LLM</button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
