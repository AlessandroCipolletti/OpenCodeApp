'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AppNav } from '@/components/AppNav';
import { ExtensionHost } from '@/components/ExtensionHost';

function ExtPageContent() {
  const params = useParams<{ slug: string[] }>();
  const searchParams = useSearchParams();
  const tenant = searchParams.get('tenant') ?? 'tenant-1';
  const slug = (params.slug ?? []).join('/');

  return (
    <main>
      <AppNav tenant={tenant} active={`ext:${slug}`} />
      <div className="container">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Extension: {slug}</h2>
            <span className="badge badge-blue">AI-Modifiable</span>
          </div>
          <ExtensionHost tenant={tenant} slug={slug} />
        </div>
      </div>
    </main>
  );
}

export default function ExtPage() {
  return (
    <Suspense>
      <ExtPageContent />
    </Suspense>
  );
}
