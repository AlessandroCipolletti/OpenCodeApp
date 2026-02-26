import { Suspense } from "react";
import ItemList from "./ItemList";
import TenantSwitcher from "./TenantSwitcher";

interface HomeProps {
  searchParams: { tenant?: string };
}

export default function Home({ searchParams }: HomeProps) {
  const tenant = searchParams.tenant ?? "tenant-1";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Items</h1>
        <TenantSwitcher currentTenant={tenant} />
      </div>

      <Suspense
        fallback={
          <div className="text-gray-500 animate-pulse">Loading items…</div>
        }
      >
        <ItemList tenant={tenant} />
      </Suspense>
    </div>
  );
}
