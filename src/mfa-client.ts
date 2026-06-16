import { api } from "./api";
import { isTeacherSpaceRole } from "./rbac";

export function shouldShowPrivilegedMfaRecommendation(role: unknown): boolean {
  return isTeacherSpaceRole(role);
}

export async function fetchPrivilegedMfaSetupRequired(): Promise<boolean> {
  const data = await api.getMfaStatus();
  const protectedAccount = Boolean(data.totpEnabled) || Number(data.passkeyCount || 0) > 0;
  return !protectedAccount;
}
