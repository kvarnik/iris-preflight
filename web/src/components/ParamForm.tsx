import type { Operation } from "../lib/types";
import { fieldClass } from "../lib/theme";

type Props = {
  operation: Operation;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
};

export function ParamForm({ operation, values, onChange }: Props) {
  if (!operation.parameters.length) {
    return <p className="text-sm text-ink-muted">No parameters.</p>;
  }
  return (
    <div className="grid gap-3">
      {operation.parameters.map((parameter) => (
        <label key={parameter.name} className="block text-sm">
          <span className="text-ink">
            {parameter.name}
            {parameter.required ? <span className="text-danger"> *</span> : null}
            <span className="ml-2 font-mono text-xs text-ink-muted">
              {parameter.in} · {parameter.type}
            </span>
          </span>
          {parameter.enum ? (
            <select
              className={fieldClass}
              value={values[parameter.name] ?? ""}
              onChange={(e) => onChange(parameter.name, e.target.value)}
            >
              <option value="">—</option>
              {parameter.enum.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={fieldClass}
              value={values[parameter.name] ?? ""}
              placeholder={parameter.example != null ? String(parameter.example) : parameter.default != null ? String(parameter.default) : ""}
              onChange={(e) => onChange(parameter.name, e.target.value)}
            />
          )}
          {parameter.description ? (
            <span className="mt-1 block text-xs text-ink-muted">{parameter.description}</span>
          ) : null}
        </label>
      ))}
    </div>
  );
}
