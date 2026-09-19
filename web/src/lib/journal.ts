import { preflightFetch } from "./api";
import type { JournalEntry } from "./types";

export async function persistEntry(entry: JournalEntry): Promise<JournalEntry> {
  const response = await preflightFetch("/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `persist failed (${response.status})`);
  }
  return (await response.json()) as JournalEntry;
}

export async function listEntries(): Promise<JournalEntry[]> {
  const response = await preflightFetch("/entries");
  if (!response.ok) throw new Error(`list entries failed (${response.status})`);
  return (await response.json()) as JournalEntry[];
}

export async function markRolledBack(id: string | number): Promise<JournalEntry> {
  const response = await preflightFetch(`/entries/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rolledBack: true }),
  });
  if (!response.ok) throw new Error(`update entry failed (${response.status})`);
  return (await response.json()) as JournalEntry;
}

export async function updateEntry(
  id: string | number,
  patch: Partial<JournalEntry>,
): Promise<JournalEntry> {
  const response = await preflightFetch(`/entries/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(`update entry failed (${response.status})`);
  return (await response.json()) as JournalEntry;
}

export async function pingPreflight(): Promise<boolean> {
  try {
    const response = await preflightFetch("/ping");
    return response.ok;
  } catch {
    return false;
  }
}
