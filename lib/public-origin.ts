function validOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function getPublicOrigin(request: Request, configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL) {
  const configuredOrigin = validOrigin(configuredSiteUrl);
  if (configuredOrigin) return configuredOrigin;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const protocol = forwardedProtocol === "http" || forwardedProtocol === "https" ? forwardedProtocol : "https";
    const forwardedOrigin = validOrigin(`${protocol}://${forwardedHost}`);
    if (forwardedOrigin) return forwardedOrigin;
  }

  return new URL(request.url).origin;
}
