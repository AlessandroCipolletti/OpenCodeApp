interface Item {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

async function getItems(tenant: string): Promise<Item[]> {
  const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
  const res = await fetch(`${apiUrl}/items?tenant=${encodeURIComponent(tenant)}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  return res.json() as Promise<Item[]>;
}

export default async function ItemList({ tenant }: { tenant: string }) {
  const items = await getItems(tenant);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">No items found for tenant <strong>{tenant}</strong>.</p>
        <p className="text-sm text-gray-400 mt-2">
          Use the API to create items: POST /items?tenant={tenant}
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
      {items.map((item) => (
        <li key={item.id} className="px-5 py-4 hover:bg-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900">{item.name}</p>
              {item.description && (
                <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
              )}
            </div>
            <span className="text-xs text-gray-400">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
