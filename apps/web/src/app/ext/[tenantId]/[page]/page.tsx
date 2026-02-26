interface ExtensionPage {
  name: string;
  file: string;
}

interface Extension {
  name: string;
  pages?: ExtensionPage[];
}

async function getExtensionPage(
  tenantId: string,
  page: string
): Promise<{ content: string | null; extensionName: string | null }> {
  const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

  const res = await fetch(
    `${apiUrl}/extensions?tenant=${encodeURIComponent(tenantId)}`,
    { cache: "no-store" }
  );

  if (!res.ok) return { content: null, extensionName: null };

  const extensions = (await res.json()) as Extension[];

  for (const ext of extensions) {
    const match = ext.pages?.find((p) => p.name === page);
    if (match) {
      return { content: `Extension: ${ext.name} | Page: ${match.name}`, extensionName: ext.name };
    }
  }

  return { content: null, extensionName: null };
}

interface PageProps {
  params: { tenantId: string; page: string };
}

export default async function ExtensionPage({ params }: PageProps) {
  const { tenantId, page } = params;
  const { content, extensionName } = await getExtensionPage(tenantId, page);

  if (!content) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">
          Extension page <strong>{page}</strong> not found for tenant{" "}
          <strong>{tenantId}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <span className="inline-block rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
          Extension: {extensionName}
        </span>
        <h1 className="mt-2 text-2xl font-bold capitalize">{page}</h1>
        <p className="text-sm text-gray-500">
          Tenant: {tenantId}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-700">{content}</p>
        <p className="mt-4 text-sm text-gray-400">
          This page is rendered by the <strong>{extensionName}</strong> extension.
          Extension components receive only SDK-provided props and cannot access
          core framework internals.
        </p>
      </div>
    </div>
  );
}
