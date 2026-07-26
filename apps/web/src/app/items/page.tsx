'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface Item {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

function ItemsPageContent() {
  const searchParams = useSearchParams();
  const tenant = searchParams.get('tenant') ?? 'tenant-1';
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const fetchItems = useCallback(async () => {
    const res = await fetch(`${API}/api/items?tenant=${tenant}`);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, [tenant, API]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API}/api/items?tenant=${tenant}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
    setTitle('');
    setDescription('');
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    await fetch(`${API}/api/items/${id}?tenant=${tenant}`, { method: 'DELETE' });
    fetchItems();
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
        <h2>Items</h2>
        <div className="card">
          <h3>Add Item</h3>
          <form onSubmit={createItem}>
            <label>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Item title" />
            <label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={3} />
            <button type="submit" className="btn-primary">Create Item</button>
          </form>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : items.length === 0 ? (
          <p style={{ color: '#64748b' }}>No items yet. Create one above!</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong>{item.title}</strong>
                <p style={{ color: '#64748b', margin: '0.25rem 0' }}>{item.description}</p>
                <small style={{ color: '#94a3b8' }}>{new Date(item.createdAt).toLocaleDateString()}</small>
              </div>
              <button onClick={() => deleteItem(item.id)} className="btn-danger" style={{ flexShrink: 0 }}>Delete</button>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

export default function ItemsPage() {
  return (
    <Suspense>
      <ItemsPageContent />
    </Suspense>
  );
}
