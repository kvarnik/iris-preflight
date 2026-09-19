import type { Operation, Preview, ServerInfo } from "./types";

/** Map Info.privileges keys onto inventory privilege names. */
export const INFO_TO_PRIVILEGE: Record<string, string> = {
  ExternalLanguageServerEdit: "%Admin_ExternalLanguageServerEdit:U",
  Journal: "%Admin_Journal:U",
  Manage: "%Admin_Manage:U",
  OAuth2_Client: "%Admin_OAuth2_Client:U",
  OAuth2_Registration: "%Admin_OAuth2_Registration:U",
  OAuth2_Server: "%Admin_OAuth2_Server:U",
  Operate: "%Admin_Operate:U",
  Secure: "%Admin_Secure:U",
  Task: "%Admin_Task:U",
  Wallet: "%Admin_Wallet:U",
  FileSystemAccess: "%Admin_FileSystemAccess:U",
};

export function privilegesFromInfo(info: ServerInfo): Set<string> {
  const held = new Set<string>();
  for (const [key, priv] of Object.entries(INFO_TO_PRIVILEGE)) {
    if (info.privileges?.[key]?.use) held.add(priv);
  }
  return held;
}

export function privilegesFromRoleResources(
  resources: { Name?: string; Permissions?: string }[] | undefined,
): Set<string> {
  const held = new Set<string>();
  for (const resource of resources || []) {
    const name = resource.Name || "";
    const perms = resource.Permissions || "";
    if (!name.startsWith("%Admin_") || !perms.includes("U")) continue;
    held.add(`${name}:U`);
  }
  return held;
}

export function previewOperation(
  op: Operation,
  held: Set<string>,
  simulated?: Set<string> | null,
): Preview {
  const effective = simulated ?? held;
  const required = op.privileges;
  const heldRequired = required.filter((p) => effective.has(p));
  const missing = required.filter((p) => !effective.has(p));
  let allowed = true;
  if (op.privilegeMode === "any") {
    allowed = required.length === 0 || heldRequired.length > 0;
  } else if (op.privilegeMode === "one") {
    allowed = missing.length === 0;
  }
  return {
    allowed,
    mode: op.privilegeMode,
    required,
    held: [...effective],
    missing,
    simulated: Boolean(simulated),
  };
}
