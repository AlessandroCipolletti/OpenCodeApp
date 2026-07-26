'use client';

import { useEffect, useRef, useState } from 'react';
import React from 'react';
import * as ReactDOM from 'react-dom/client';
import * as ReactJSXRuntime from 'react/jsx-runtime';

type HostWindow = Window & {
  React?: unknown;
  ReactDOM?: unknown;
  ReactJSXRuntime?: unknown;
  OpenCodeAppExtension?:
    | { default?: React.ComponentType<{ slug?: string }> }
    | React.ComponentType<{ slug?: string }>;
};

type ExtComponent = React.ComponentType<{ slug?: string }>;

function resolveComponent(exported: HostWindow['OpenCodeAppExtension']): ExtComponent | undefined {
  if (typeof exported === 'function') return exported;
  if (exported && typeof exported === 'object' && typeof exported.default === 'function') {
    return exported.default;
  }
  return undefined;
}

function safeUnmount(root: ReactDOM.Root | null) {
  if (!root) return;
  // Avoid "Attempted to synchronously unmount a root while React was already rendering"
  queueMicrotask(() => {
    try {
      root.unmount();
    } catch {
      // ignore unmount races during fast navigations
    }
  });
}

export function ExtensionHost({ tenant, slug }: { tenant: string; slug: string }) {
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const mountRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<ReactDOM.Root | null>(null);
  const componentRef = useRef<ExtComponent | null>(null);
  const loadedTenantRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const mount = mountRef.current;
    if (!mount) return;

    async function ensureBundleAndRender() {
      setError(null);

      try {
        const hostWindow = window as HostWindow;
        hostWindow.React = React;
        hostWindow.ReactDOM = ReactDOM;
        hostWindow.ReactJSXRuntime = ReactJSXRuntime;

        // Same tenant => reuse loaded component; only re-render with new slug
        if (loadedTenantRef.current !== tenant || !componentRef.current) {
          setLoading(true);
          const response = await fetch(
            `${API}/api/extensions/bundle?tenant=${encodeURIComponent(tenant)}&extension=ui&t=${Date.now()}`,
          );
          if (!response.ok) {
            throw new Error(`Failed to load extension bundle (${response.status})`);
          }
          const code = await response.text();
          if (cancelled) return;

          // Bundle is an IIFE assigned to `var OpenCodeAppExtension`.
          // Inside `new Function` that var is local, so we must return it.
          // eslint-disable-next-line no-new-func
          const run = new Function(
            `${code}\n; var __ext = (typeof OpenCodeAppExtension !== 'undefined' ? OpenCodeAppExtension : globalThis.OpenCodeAppExtension); globalThis.OpenCodeAppExtension = __ext; return __ext;`,
          );
          const exported = run() as HostWindow['OpenCodeAppExtension'];
          hostWindow.OpenCodeAppExtension = exported;

          const Comp = resolveComponent(exported);
          if (!Comp) {
            throw new Error('Extension bundle did not export a React component');
          }

          componentRef.current = Comp;
          loadedTenantRef.current = tenant;
        }

        if (cancelled) return;

        if (!rootRef.current) {
          rootRef.current = ReactDOM.createRoot(mount!);
        }

        rootRef.current.render(
          React.createElement(componentRef.current!, { slug }),
        );
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void ensureBundleAndRender();

    return () => {
      cancelled = true;
    };
  }, [API, tenant, slug]);

  useEffect(() => {
    return () => {
      const root = rootRef.current;
      rootRef.current = null;
      componentRef.current = null;
      loadedTenantRef.current = null;
      safeUnmount(root);
    };
  }, []);

  return (
    <div>
      {loading && <p style={{ color: '#64748b' }}>Loading extension…</p>}
      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 6 }}>
          {error}
        </div>
      )}
      <div ref={mountRef} />
    </div>
  );
}
