import raw from "@data/inventory.json";
import type { Inventory, Operation } from "./types";

export const EXPECTED_COUNTS = {
  operations: 276,
  paths: 190,
  tags: 21,
  privileges: 11,
  read: 118,
  mutating: 96,
  destructive: 62,
  async: 16,
  unprivileged: 5,
} as const;

export const inventory = raw as Inventory;

export function assertInventory(): void {
  const counts = inventory.meta.counts;
  const failed = Object.entries(EXPECTED_COUNTS)
    .filter(([key, expected]) => counts[key as keyof typeof counts] !== expected)
    .map(([key, expected]) => `${key}: expected ${expected}, got ${counts[key as keyof typeof counts]}`);
  if (failed.length) {
    throw new Error("inventory count assertions failed: " + failed.join("; "));
  }
}

export function getOperation(id: string): Operation | undefined {
  return inventory.operations.find((op) => op.id === id);
}

export function getReadPair(op: Operation): Operation | undefined {
  if (op.method === "GET") return op;
  return inventory.operations.find((candidate) => candidate.path === op.path && candidate.method === "GET");
}

export function searchOperations(query: string, tag: string, risk: string): Operation[] {
  const q = query.trim().toLowerCase();
  return inventory.operations.filter((op) => {
    if (tag && op.tag !== tag) return false;
    if (risk && op.risk !== risk) return false;
    if (!q) return true;
    return (
      op.id.toLowerCase().includes(q) ||
      op.summary.toLowerCase().includes(q) ||
      op.path.toLowerCase().includes(q) ||
      op.privileges.some((p) => p.toLowerCase().includes(q))
    );
  });
}
