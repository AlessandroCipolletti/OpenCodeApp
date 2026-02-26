/**
 * Hello extension page for tenant-1.
 *
 * This file is inside the extension sandbox:
 *   tenants/tenant-1/extensions/ui/pages/hello.tsx
 *
 * It may ONLY use props provided by the SDK — no direct DB or secret access.
 */

import type { OpenCodeAppSdk } from "@opencodeapp/sdk";

interface HelloPageProps {
  sdk: OpenCodeAppSdk;
  tenantId: string;
}

export default function HelloPage({ sdk, tenantId }: HelloPageProps) {
  // In a real implementation the server would call sdk.audit.log() before
  // rendering and inject any fetched data as additional props.
  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1 style={{ color: "#4f46e5" }}>👋 Hello from the UI Extension!</h1>
      <p>
        This page is rendered by the <strong>ui-extension</strong> for tenant{" "}
        <strong>{tenantId}</strong>.
      </p>
      <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
        Access this page at:{" "}
        <code>/ext/{tenantId}/hello</code>
      </p>
      <hr style={{ margin: "1.5rem 0" }} />
      <p style={{ fontSize: "0.875rem" }}>
        Extension capabilities:{" "}
        <code>{sdk.context.capabilities.join(", ")}</code>
      </p>
    </div>
  );
}
