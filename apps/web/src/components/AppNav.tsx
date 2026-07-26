'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ExtRoute {
  slug: string;
  title: string;
  href: string;
}

export function AppNav({ tenant, active }: { tenant: string; active?: string }) {
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const [extRoutes, setExtRoutes] = useState<ExtRoute[]>([]);

  useEffect(() => {
    fetch(`${API}/api/extensions/routes?tenant=${tenant}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const routes = Array.isArray(data) ? data : [];
        // Fallback so the classic Extension page never disappears if the API is empty/down
        if (routes.length === 0) {
          setExtRoutes([{ slug: 'custom-items', title: 'Extension', href: '/ext/custom-items' }]);
          return;
        }
        setExtRoutes(routes);
      })
      .catch(() => {
        setExtRoutes([{ slug: 'custom-items', title: 'Extension', href: '/ext/custom-items' }]);
      });
  }, [API, tenant]);

  const linkClass = (key: string) => (active === key ? 'active' : undefined);

  return (
    <nav>
      <span className="brand">OpenCodeApp</span>
      <Link href={`/items?tenant=${tenant}`} className={linkClass('items')}>Items</Link>
      {extRoutes.map((route) => (
        <Link
          key={route.slug}
          href={`${route.href}?tenant=${tenant}`}
          className={linkClass(`ext:${route.slug}`)}
        >
          {route.title}
        </Link>
      ))}
      <Link href={`/history?tenant=${tenant}`} className={linkClass('history')}>History</Link>
      <Link href={`/settings?tenant=${tenant}`} className={linkClass('settings')}>Settings</Link>
    </nav>
  );
}
