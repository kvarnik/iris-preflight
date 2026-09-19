import { authHeaders } from "./auth";
import type { AdminEnvelope, Operation, ServerInfo } from "./types";

export type CallResult = {
  ok: boolean;
  status: number;
  envelope: AdminEnvelope | null;
  raw: unknown;
  location: string | null;
  asyncTaskGUID: string | null;
  error: string | null;
  privilegeDenied: boolean;
};

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function errorText(item: unknown): string | null {
  if (typeof item === "string" && item.trim()) return decodeEntities(item);
  if (item && typeof item === "object") {
    const rec = item as { error?: unknown; message?: unknown };
    if (typeof rec.error === "string" && rec.error.trim()) return decodeEntities(rec.error);
    if (typeof rec.message === "string" && rec.message.trim()) return decodeEntities(rec.message);
  }
  return null;
}

function statusMessage(status: number, envelope: AdminEnvelope | null, fallback: string): string {
  const errors = envelope?.status?.errors || envelope?.status?.Errors;
  const fromErrors = Array.isArray(errors)
    ? errors.map(errorText).filter((value): value is string => Boolean(value))
    : [];
  if (fromErrors.length) return fromErrors.join("; ");
  if (envelope?.status?.summary) return decodeEntities(String(envelope.status.summary));
  if (status === 401) return "Unauthorized — check credentials";
  if (status === 403) return "Forbidden — missing privilege";
  if (status === 404) return "Not found";
  if (status === 400) return "Bad request";
  if (status === 409) return "Conflict";
  if (status === 500) return "Server error";
  return fallback;
}

function extractGuid(envelope: AdminEnvelope | null, location: string | null): string | null {
  if (location) {
    try {
      const url = new URL(location, window.location.origin);
      const id = url.searchParams.get("id");
      if (id) return id;
    } catch {
      const match = /[?&]id=([^&]+)/.exec(location);
      if (match) return decodeURIComponent(match[1]);
    }
  }
  const result = envelope?.result;
  if (result && typeof result === "object") {
    const rec = result as Record<string, unknown>;
    const guid = rec.AsyncTaskGUID || rec.GUID || rec.Id || rec.id;
    if (typeof guid === "string" || typeof guid === "number") return String(guid);
  }
  return null;
}

export function buildUrl(op: Operation, params: Record<string, string>): string {
  let path = op.path;
  const query = new URLSearchParams();
  for (const parameter of op.parameters) {
    const value = params[parameter.name];
    if (value === undefined || value === "") continue;
    if (parameter.in === "path") {
      path = path.replace(`{${parameter.name}}`, encodeURIComponent(value));
    } else if (parameter.in === "header") {
      continue;
    } else {
      query.set(parameter.name, value);
    }
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function adminCall(
  method: string,
  pathAndQuery: string,
  body?: unknown,
): Promise<CallResult> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...authHeaders(),
  };
  const init: RequestInit = { method, headers };
  if (body !== undefined && method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const response = await fetch(`/api/admin${pathAndQuery}`, init);
  const location = response.headers.get("Location");
  let raw: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      raw = JSON.parse(text);
    } catch {
      raw = text;
    }
  }
  const envelope = raw && typeof raw === "object" ? (raw as AdminEnvelope) : null;
  const privilegeDenied = response.status === 403;
  return {
    ok: response.ok,
    status: response.status,
    envelope,
    raw,
    location,
    asyncTaskGUID: response.status === 202 ? extractGuid(envelope, location) : null,
    error: response.ok ? null : statusMessage(response.status, envelope, text || response.statusText),
    privilegeDenied,
  };
}

export async function getInfo(basic: string): Promise<ServerInfo> {
  const response = await fetch("/api/admin/info", {
    headers: { Authorization: `Basic ${basic}`, Accept: "application/json" },
  });
  if (response.status === 401) throw new Error("Invalid credentials");
  if (!response.ok) throw new Error(`GET /info failed (${response.status})`);
  const payload = (await response.json()) as AdminEnvelope;
  const result = payload.result as ServerInfo | undefined;
  if (!result) throw new Error("GET /info returned no result");
  return result;
}

export async function preflightFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...authHeaders(),
    ...(init?.headers as Record<string, string> | undefined),
  };
  return fetch(`/api/preflight${path}`, { ...init, headers });
}
