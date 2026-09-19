import { inventory } from "../lib/inventory";
import { privilegesFromInfo, previewOperation } from "../lib/privileges";
import { getSession } from "../lib/auth";

export function Matrix() {
  const session = getSession();
  const held = session ? privilegesFromInfo(session.info) : new Set<string>();
  const privileges = inventory.privileges;

  return (
    <div className="h-full overflow-auto bg-surface p-5">
      <h1 className="text-xl font-semibold">Privilege matrix</h1>
      <p className="mb-4 text-sm text-ink-muted">
        Each cell is an operation that requires that privilege. Green = you hold it. Red = you do not.
      </p>
      <div className="overflow-auto rounded-xl border border-line bg-surface-raised">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-surface-raised p-2">Privilege</th>
              <th className="p-2">Ops</th>
              <th className="p-2">You</th>
              <th className="p-2">Tags</th>
            </tr>
          </thead>
          <tbody>
            {privileges.map((priv) => (
              <tr key={priv.name} className="border-t border-line">
                <td className="sticky left-0 bg-surface-raised p-2 font-mono">{priv.name}</td>
                <td className="p-2">{priv.operationCount}</td>
                <td className={`p-2 ${held.has(priv.name) ? "text-ok" : "text-danger"}`}>
                  {held.has(priv.name) ? "held" : "missing"}
                </td>
                <td className="p-2 text-ink-muted">{priv.tags.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-muted">Operations you cannot call</h2>
      <ul className="mt-2 columns-2 gap-6 text-xs">
        {inventory.operations
          .filter((op) => !previewOperation(op, held).allowed)
          .map((op) => (
            <li key={op.id} className="mb-1 font-mono text-danger">
              {op.id}
            </li>
          ))}
      </ul>
    </div>
  );
}
