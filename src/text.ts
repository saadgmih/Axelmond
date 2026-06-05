export function decodeStoredText(value: string) {
  let decoded = value;
  for (let i = 0; i < 5; i++) {
    const next = decoded
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&#x2F;/g, "/");
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

export function decodeStoredValue<T>(value: T): T {
  if (typeof value === "string") return decodeStoredText(value) as T;
  if (Array.isArray(value)) return value.map((item) => decodeStoredValue(item)) as T;
  if (value && typeof value === "object") {
    const decoded: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      decoded[key] = decodeStoredValue(item);
    }
    return decoded as T;
  }
  return value;
}
