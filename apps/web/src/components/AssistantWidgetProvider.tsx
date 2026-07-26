'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AssistantWidget } from './AssistantWidget';

function AssistantWidgetProviderContent() {
  const searchParams = useSearchParams();
  const tenant = searchParams.get('tenant') ?? 'tenant-1';
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const [showWidget, setShowWidget] = useState(false);

  useEffect(() => {
    // CRITICAL: Only show widget if tenant has LLM key configured
    fetch(`${API}/api/settings/llm?tenant=${tenant}`)
      .then(r => r.json())
      .then(data => {
        // Show widget if provider is mock (no key needed) OR if real key is configured
        setShowWidget(data.provider === 'mock' || data.hasApiKey === true);
      })
      .catch(() => setShowWidget(false));
  }, [tenant, API]);

  if (!showWidget) return null;
  return <AssistantWidget tenant={tenant} />;
}

export function AssistantWidgetProvider() {
  return (
    <Suspense>
      <AssistantWidgetProviderContent />
    </Suspense>
  );
}
