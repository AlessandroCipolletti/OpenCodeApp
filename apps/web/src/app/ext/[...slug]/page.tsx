import Link from 'next/link';

interface ExtPageProps {
  params: { slug: string[] };
  searchParams: { tenant?: string };
}

export default function ExtPage({ params, searchParams }: ExtPageProps) {
  const tenant = searchParams.tenant ?? 'tenant-1';
  const slug = params.slug.join('/');

  return (
    <main>
      <nav>
        <span className="brand">OpenCodeApp</span>
        <Link href={`/items?tenant=${tenant}`}>Items</Link>
        <Link href={`/ext/custom-items?tenant=${tenant}`}>Extension</Link>
        <Link href={`/history?tenant=${tenant}`}>History</Link>
        <Link href={`/settings?tenant=${tenant}`}>Settings</Link>
      </nav>
      <div className="container">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Extension: {slug}</h2>
            <span className="badge badge-blue">AI-Modifiable</span>
          </div>
          <ExtensionContent tenant={tenant} slug={slug} />
        </div>
      </div>
    </main>
  );
}

function ExtensionContent({ tenant, slug }: { tenant: string; slug: string }) {
  // This area is rendered server-side; in a full implementation,
  // the extension bundle would be loaded and rendered here.
  // For MVP, we show the current extension content via an iframe or static render.
  return (
    <div>
      <p style={{ color: '#64748b' }}>
        This page is managed by the AI agent. Use the assistant widget (bottom-right) to modify this page.
      </p>
      <div style={{
        border: '2px dashed #cbd5e1',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center',
        color: '#94a3b8',
        marginTop: '1rem',
      }}>
        <p>Extension content for <strong>{slug}</strong> (tenant: {tenant})</p>
        <p style={{ fontSize: '0.85rem' }}>
          Extension bundles are loaded from <code>tenants/{tenant}/extensions/ui/</code>
        </p>
      </div>
    </div>
  );
}
