'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const tenant = searchParams.get('tenant') ?? 'tenant-1';
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  const [provider, setProvider] = useState('mock');
  const [model, setModel] = useState('gpt-4o');
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/settings/llm?tenant=${tenant}`)
      .then(r => r.json())
      .then(data => {
        setProvider(data.provider);
        setModel(data.model);
        setHasKey(data.hasApiKey);
      })
      .catch(console.error);
  }, [tenant, API]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API}/api/settings/llm?tenant=${tenant}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, model, apiKey: apiKey || undefined }),
    });
    setApiKey('');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    const updated = await fetch(`${API}/api/settings/llm?tenant=${tenant}`).then(r => r.json());
    setHasKey(updated.hasApiKey);
  };

  const removeKey = async () => {
    await fetch(`${API}/api/settings/llm?tenant=${tenant}`, { method: 'DELETE' });
    setHasKey(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

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
        <h2>LLM Settings</h2>
        <div className="card">
          {saved && (
            <div style={{ background: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
              ✅ Saved successfully
            </div>
          )}
          <form onSubmit={save}>
            <label>Provider</label>
            <select value={provider} onChange={e => setProvider(e.target.value)}>
              <option value="mock">Mock (no key needed)</option>
              <option value="openai">OpenAI</option>
            </select>

            <label>Model</label>
            <input value={model} onChange={e => setModel(e.target.value)} placeholder="gpt-4o" />

            <label>API Key {hasKey && <span className="badge badge-green">Key saved</span>}</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={hasKey ? '••••••••••••••••' : 'Enter your API key'}
            />
            <small style={{ color: '#64748b', display: 'block', marginBottom: '1rem' }}>
              Keys are stored encrypted server-side and never exposed to the browser.
            </small>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn-primary">Save Settings</button>
              {hasKey && (
                <button type="button" onClick={removeKey} className="btn-danger">Remove Key</button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>About the AI Widget</h3>
          <p style={{ color: '#64748b' }}>
            The floating AI assistant (bottom-right) only appears when an LLM key is configured.
            Configure an API key above, or use the <strong>Mock</strong> provider to test without a key.
          </p>
          <p style={{ color: '#64748b' }}>
            <strong>Note:</strong> The Mock provider generates simulated patches for testing.
            For real AI-powered code generation, use OpenAI with a valid API key.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsPageContent />
    </Suspense>
  );
}
