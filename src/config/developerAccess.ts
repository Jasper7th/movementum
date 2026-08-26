const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseDeveloperUserIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const ids = raw.split(',').map((value) => value.trim().toLowerCase());
  if (ids.some((id) => !id || !uuidPattern.test(id))) return [];
  return [...new Set(ids)];
}

export function isDeveloperUser(
  userId: string | null | undefined,
  rawAllowlist = process.env.EXPO_PUBLIC_DEVELOPER_USER_IDS,
): boolean {
  if (!userId || !uuidPattern.test(userId)) return false;
  return parseDeveloperUserIds(rawAllowlist).includes(userId.toLowerCase());
}
