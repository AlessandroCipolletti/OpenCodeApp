'use client';

import Link from 'next/link';
import { AppNav } from '@/components/AppNav';

export default function HomePage() {
  return (
    <main>
      <AppNav tenant="tenant-1" />
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
