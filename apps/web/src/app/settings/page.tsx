'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AppNav } from '@/components/AppNav';

interface CodingModel {
  id: string;
  created: number;
  ownedBy: string;
}

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const tenant = searchParams.get('tenant') ?? 'tenant-1';
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  const [provider, setProvider] = useState('mock');
  const [model, setModel] = useState('gpt-4o');
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [models, setModels] = useState<CodingModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const modelsRequestId = useRef(0);

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

  const loadModels = useCallback(async (keyOverride?: string) => {
    const requestId = ++modelsRequestId.current;
    setModelsLoading(true);
    setModelsError(null);

    try {
      const response = await fetch(`${API}/api/settings/llm/models?tenant=${tenant}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyOverride || undefined }),
      });
      const data = await response.json();
      if (requestId !== modelsRequestId.current) return;

      if (!response.ok) {
        setModels([]);
        setModelsError(data.message ?? 'Failed to load models from OpenAI');
        return;
      }

      const nextModels: CodingModel[] = data.models ?? [];
      setModels(nextModels);
      setModelsError(null);

      setModel((current) => {
        if (nextModels.some((m) => m.id === current)) return current;
        return nextModels[0]?.id ?? current;
      });
    } catch (err) {
      if (requestId !== modelsRequestId.current) return;
      setModels([]);
      setModelsError((err as Error).message || 'Failed to load models from OpenAI');
    } finally {
      if (requestId === modelsRequestId.current) {
        setModelsLoading(false);
      }
    }
  }, [API, tenant]);

  useEffect(() => {
    if (provider !== 'openai') {
      setModels([]);
      setModelsError(null);
      setModelsLoading(false);
      return;
    }

    if (!hasKey && !apiKey.trim()) {
      setModels([]);
      setModelsError('Enter an API key to load available coding models.');
      return;
    }

    const timer = setTimeout(() => {
      void loadModels(apiKey.trim() || undefined);
    }, apiKey.trim() ? 400 : 0);

    return () => clearTimeout(timer);
  }, [provider, hasKey, apiKey, loadModels]);

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
    setModels([]);
    setModelsError('Enter an API key to load available coding models.');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <main>
      <AppNav tenant={tenant} active="settings" />
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

            <label>API Key {hasKey && <span className="badge badge-green">Key saved</span>}</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={hasKey ? '••••••••••••••••' : 'Enter your API key'}
            />
            <small style={{ color: '#64748b', display: 'block', marginBottom: '1rem' }}>
              Keys are stored encrypted server-side and never exposed to the browser.
              {provider === 'openai' && ' Used to fetch the live model list from OpenAI.'}
            </small>

            <label>
              Model
              {provider === 'openai' && modelsLoading && (
                <span className="spinner" aria-label="Loading models" style={{ marginLeft: '0.5rem' }} />
              )}
            </label>
            {provider === 'openai' ? (
              <>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  disabled={modelsLoading || models.length === 0}
                >
                  {modelsLoading && <option value={model}>Loading models…</option>}
                  {!modelsLoading && models.length === 0 && (
                    <option value={model}>{model || 'No models available'}</option>
                  )}
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.id}</option>
                  ))}
                </select>
                {modelsError && (
                  <small style={{ color: '#b91c1c', display: 'block', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                    {modelsError}
                  </small>
                )}
                {!modelsError && !modelsLoading && models.length > 0 && (
                  <small style={{ color: '#64748b', display: 'block', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                    Showing {models.length} coding-capable models from OpenAI.
                  </small>
                )}
              </>
            ) : (
              <input value={model} onChange={e => setModel(e.target.value)} placeholder="mock" />
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn-primary">Save Settings</button>
              {hasKey && (
                <button type="button" onClick={removeKey} className="btn-danger">Remove Key</button>
              )}
              {provider === 'openai' && (hasKey || apiKey.trim()) && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void loadModels(apiKey.trim() || undefined)}
                  disabled={modelsLoading}
                >
                  Refresh models
                </button>
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
