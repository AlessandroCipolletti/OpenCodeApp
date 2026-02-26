/**
 * TenantContext holds the resolved identity for the current request.
 * It is populated from the ?tenant=<slug> query parameter and verified
 * against the database before being placed on the request object.
 */
export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
}

/**
 * Extract the tenant slug from a query string map.
 * Throws if the tenant param is missing or invalid.
 */
export function extractTenantSlug(
  query: Record<string, string | string[] | undefined>
): string {
  const raw = query["tenant"];
  const slug = Array.isArray(raw) ? raw[0] : raw;
  if (!slug || typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(
      'Missing or invalid "tenant" query parameter. ' +
        "Must be lowercase alphanumeric with hyphens."
    );
  }
  return slug;
}
