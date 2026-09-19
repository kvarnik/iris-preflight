import { diffValues, summarizeDiff, type DiffNode } from "../lib/diff";

type Props = { before: unknown; after: unknown };

function color(kind: DiffNode["kind"]): string {
  if (kind === "added") return "text-ok";
  if (kind === "removed") return "text-danger";
  if (kind === "changed") return "text-warn";
  return "text-ink-muted";
}

export function DiffView({ before, after }: Props) {
  const nodes = diffValues(before, after);
  return (
    <div>
      <p className="mb-2 text-sm text-ink-muted">{summarizeDiff(nodes)}</p>
      {nodes.length === 0 ? (
        <p className="text-sm text-ink-muted">Empty</p>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-auto font-mono text-xs">
          {nodes.map((node) => (
            <li key={node.path} className={color(node.kind)}>
              <span className="text-ink-muted">{node.kind}</span> {node.path}
              {node.kind === "changed" ? (
                <span>
                  {" "}
                  {JSON.stringify(node.before)} → {JSON.stringify(node.after)}
                </span>
              ) : null}
              {node.kind === "added" ? <span> {JSON.stringify(node.after)}</span> : null}
              {node.kind === "removed" ? <span> {JSON.stringify(node.before)}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
