"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const KNOWN_TENANTS = ["tenant-1"];

export default function TenantSwitcher({
  currentTenant,
}: {
  currentTenant: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tenant", e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="tenant-select" className="text-sm text-gray-600">
        Tenant:
      </label>
      <select
        id="tenant-select"
        value={currentTenant}
        onChange={handleChange}
        className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {KNOWN_TENANTS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}
