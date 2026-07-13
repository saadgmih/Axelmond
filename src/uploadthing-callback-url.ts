function buildCallbackUrl(appUrl: string): string | undefined {
  try {
    return new URL("/api/uploadthing", appUrl).toString();
  } catch {
    return undefined;
  }
}

export function resolveUploadThingCallbackUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const appUrl = env.APP_URL?.trim();
  const configuredCallback = env.UPLOADTHING_CALLBACK_URL?.trim();

  // Production callbacks must follow the canonical application origin. This
  // prevents a stale localhost or unavailable www override in the hosting panel
  // from silently dropping UploadThing's onUploadComplete response.
  if (env.NODE_ENV === "production" && appUrl) {
    const canonicalCallback = buildCallbackUrl(appUrl);
    if (canonicalCallback) return canonicalCallback;
  }

  return configuredCallback || (appUrl ? buildCallbackUrl(appUrl) : undefined);
}
