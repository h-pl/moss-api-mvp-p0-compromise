import type { ApiKeyRecord, Member } from "./data";
import { normalizeMvpMockState } from "./mvp-fixtures";
import { withSharedOwnerDefaults } from "./enterprise-resource-data";

export const mvpDemoStorageKey = "moss-api-shared-enterprise-demo-v2";
const legacyKey = "moss-api-mvp-demo-v1";
const candidateKey = "moss-api-enterprise2-shared-demo-v1";
type DemoState = { members: Member[]; apiKeys: ApiKeyRecord[] };
type DemoStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
function parse(value: string | null): DemoState | null {
  try { const saved = JSON.parse(value ?? "null"); return saved?.members?.length && Array.isArray(saved.apiKeys) ? saved : null; }
  catch { return null; }
}
export function readMvpDemoState(storage: DemoStorage): DemoState | null {
  const current = parse(storage.getItem(mvpDemoStorageKey));
  if (current) return normalizeMvpMockState(withSharedOwnerDefaults(current.members), current.apiKeys);
  const original = parse(storage.getItem(legacyKey));
  const selected = parse(storage.getItem(candidateKey));
  if (!original && !selected) return null;
  // The selected candidate wins conflicts; retain legacy-only invitations and keys.
  const members = new Map((original?.members ?? []).map(member => [member.email, member]));
  for (const member of selected?.members ?? []) members.set(member.email, member);
  const keys = new Map((original?.apiKeys ?? []).map(key => [key.id, key]));
  for (const key of selected?.apiKeys ?? []) {
    const previous = keys.get(key.id);
    keys.set(key.id, previous?.revokedByMemberRemovalAt
      ? { ...key, status: "已停用", revokedByMemberRemovalAt: previous.revokedByMemberRemovalAt }
      : key);
  }
  const migrated = normalizeMvpMockState(withSharedOwnerDefaults([...members.values()]), [...keys.values()]);
  storage.setItem(mvpDemoStorageKey, JSON.stringify(migrated));
  return migrated;
}
export function resetMvpDemoState(storage: DemoStorage) {
  for (const key of [mvpDemoStorageKey, legacyKey, candidateKey]) storage.removeItem(key);
}
