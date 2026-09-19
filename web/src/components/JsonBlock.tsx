type Props = { value: unknown; className?: string };

export function JsonBlock({ value, className = "" }: Props) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <pre className={`overflow-auto rounded-lg border border-line bg-surface-input p-3 font-mono text-xs leading-5 text-ink ${className}`}>
      {text || "—"}
    </pre>
  );
}
