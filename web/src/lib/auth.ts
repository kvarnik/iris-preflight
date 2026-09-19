import type { ServerInfo } from "./types";

type Session = {
  username: string;
  basic: string;
  info: ServerInfo;
};

let session: Session | null = null;

export function getSession(): Session | null {
  return session;
}

export function setSession(next: Session): void {
  session = next;
}

export function clearSession(): void {
  session = null;
}

export function authHeaders(): Record<string, string> {
  if (!session) return {};
  return { Authorization: `Basic ${session.basic}` };
}

export function encodeBasic(username: string, password: string): string {
  return btoa(`${username}:${password}`);
}
