export type DiffNode = {
  path: string;
  kind: "added" | "removed" | "changed" | "same";
  before?: unknown;
  after?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function diffValues(before: unknown, after: unknown, path = "$"): DiffNode[] {
  if (Object.is(before, after)) return [{ path, kind: "same", before, after }];
  if (before === undefined) return [{ path, kind: "added", after }];
  if (after === undefined) return [{ path, kind: "removed", before }];
  if (isObject(before) && isObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const out: DiffNode[] = [];
    for (const key of [...keys].sort()) {
      out.push(...diffValues(before[key], after[key], `${path}.${key}`));
    }
    return out.filter((node) => node.kind !== "same");
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length);
    const out: DiffNode[] = [];
    for (let i = 0; i < length; i += 1) {
      out.push(...diffValues(before[i], after[i], `${path}[${i}]`));
    }
    return out.filter((node) => node.kind !== "same");
  }
  return [{ path, kind: "changed", before, after }];
}

export function summarizeDiff(nodes: DiffNode[]): string {
  const added = nodes.filter((n) => n.kind === "added").length;
  const removed = nodes.filter((n) => n.kind === "removed").length;
  const changed = nodes.filter((n) => n.kind === "changed").length;
  if (!added && !removed && !changed) return "No differences";
  return `${changed} changed, ${added} added, ${removed} removed`;
}
