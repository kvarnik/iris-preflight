#!/usr/bin/env python3
"""Generate src/data/inventory.json from the pinned SysAdmin OpenAPI spec.

Never hand-edit inventory.json. Re-run this script after replacing the spec.
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC_PATH = ROOT / "spec" / "sysadmin-api.json"
OUT_PATH = ROOT / "src" / "data" / "inventory.json"

EXPECTED = {
    "operations": 276,
    "paths": 190,
    "tags": 21,
    "privileges": 11,
    "read": 118,
    "mutating": 96,
    "destructive": 62,
    "async": 16,
    "unprivileged": 5,
}

PRIV_RE = re.compile(r"^(\([^)]+\))\s*(.*)$")
PRIV_TOKEN_RE = re.compile(r"%Admin_[A-Za-z0-9_]+:[A-Z]")
DESTRUCTIVE_RE = re.compile(
    r"\b(revoke|purge|terminate|dismount|stop|suspend|truncate|"
    r"deactivate|cancel|reject|clear|logout|pause)\b",
    re.I,
)
HTTP_METHODS = {"get", "post", "put", "patch", "delete", "head", "options"}


def load_spec() -> dict:
    with SPEC_PATH.open() as f:
        return json.load(f)


def resolve_ref(spec: dict, ref: str) -> dict:
    assert ref.startswith("#/")
    node: object = spec
    for part in ref[2:].split("/"):
        node = node[part]  # type: ignore[index]
    return node  # type: ignore[return-value]


def schema_name(schema: dict | None) -> str | None:
    if not schema:
        return None
    if "$ref" in schema:
        return schema["$ref"].split("/")[-1]
    if schema.get("type") == "object" and "properties" in schema:
        return "object"
    if schema.get("type"):
        return schema["type"]
    if "allOf" in schema:
        for part in schema["allOf"]:
            name = schema_name(part)
            if name:
                return name
        return "object"
    return None


def unwrap_result(schema: dict | None) -> tuple[str | None, bool]:
    """Return (resultSchema, resultIsList) from a success response schema."""
    if not schema:
        return None, False
    if "$ref" in schema:
        name = schema["$ref"].split("/")[-1]
        return name, name.endswith("List")
    if schema.get("type") == "array":
        items = schema.get("items") or {}
        return schema_name(items), True
    if "allOf" in schema:
        for part in schema["allOf"]:
            props = part.get("properties") if isinstance(part, dict) else None
            if not props or "result" not in props:
                continue
            result = props["result"]
            if "$ref" in result:
                name = result["$ref"].split("/")[-1]
                return name, name.endswith("List")
            if result.get("type") == "array":
                items = result.get("items") or {}
                return schema_name(items), True
            if result.get("type") == "object":
                return "object", False
            inner = schema_name(result)
            return inner, bool(inner and inner.endswith("List"))
    name = schema_name(schema)
    return name, bool(name and name.endswith("List"))


def flatten_parameters(spec: dict, path_item: dict, op: dict) -> list[dict]:
    raw = list(path_item.get("parameters") or []) + list(op.get("parameters") or [])
    out = []
    for param in raw:
        if "$ref" in param:
            param = resolve_ref(spec, param["$ref"])
        schema = param.get("schema") or {}
        if "$ref" in schema:
            schema = resolve_ref(spec, schema["$ref"])
        out.append(
            {
                "name": param.get("name"),
                "in": param.get("in"),
                "required": bool(param.get("required")),
                "type": schema.get("type") or "string",
                "enum": schema.get("enum"),
                "default": schema.get("default"),
                "description": param.get("description") or "",
                "example": param.get("example", schema.get("example")),
            }
        )
    return out


def request_body_name(op: dict) -> str | None:
    body = op.get("requestBody")
    if not body:
        return None
    content = (body.get("content") or {}).get("application/json") or {}
    return schema_name(content.get("schema"))


def success_schema(op: dict) -> dict | None:
    responses = op.get("responses") or {}
    for code in ("200", "201", "202"):
        resp = responses.get(code)
        if not resp:
            continue
        if "$ref" in resp:
            return {"$ref": resp["$ref"]}
        content = (resp.get("content") or {}).get("application/json") or {}
        if content.get("schema"):
            return content["schema"]
    return None


def classify_risk(method: str, path: str, summary: str) -> str:
    if method in ("GET", "HEAD"):
        return "read"
    if method == "DELETE":
        return "destructive"
    blob = f"{path} {summary}"
    if method == "POST" and DESTRUCTIVE_RE.search(blob):
        return "destructive"
    return "mutating"


def parse_privileges(summary: str) -> tuple[list[str], str, str]:
    match = PRIV_RE.match(summary or "")
    if not match:
        return [], "none", summary or ""
    expr, rest = match.group(1)[1:-1], match.group(2)
    tokens = PRIV_TOKEN_RE.findall(expr)
    if not tokens:
        return [], "none", rest
    mode = "any" if " or " in expr else "one"
    return tokens, mode, rest


def resolve_response_schema(spec: dict, schema: dict | None) -> dict | None:
    if not schema:
        return None
    if "$ref" in schema and schema["$ref"].startswith("#/components/responses/"):
        resp = resolve_ref(spec, schema["$ref"])
        content = (resp.get("content") or {}).get("application/json") or {}
        return content.get("schema")
    return schema


def build(spec: dict) -> dict:
    operations = []
    paths = spec.get("paths") or {}
    for path, item in paths.items():
        for method, op in item.items():
            if method.lower() not in HTTP_METHODS:
                continue
            method_u = method.upper()
            summary_raw = op.get("summary") or ""
            privileges, privilege_mode, summary = parse_privileges(summary_raw)
            responses = op.get("responses") or {}
            codes = sorted(str(c) for c in responses)
            result_schema, result_is_list = unwrap_result(
                resolve_response_schema(spec, success_schema(op))
            )
            if result_schema in {"BaseResponseWithResult", "Success", "Accepted"}:
                # Shared envelope; no concrete result type.
                result_schema = "object"
                result_is_list = False
            risk = classify_risk(method_u, path, summary)
            tags = op.get("tags") or ["(none)"]
            operations.append(
                {
                    "id": f"{method_u} {path}",
                    "method": method_u,
                    "path": path,
                    "tag": tags[0],
                    "summary": summary,
                    "privileges": privileges,
                    "privilegeMode": privilege_mode,
                    "risk": risk,
                    "async": "202" in responses,
                    "requestBody": request_body_name(op),
                    "resultSchema": result_schema,
                    "resultIsList": result_is_list,
                    "parameters": flatten_parameters(spec, item, op),
                    "responseCodes": codes,
                }
            )

    operations.sort(key=lambda o: (o["tag"], o["path"], o["method"]))

    priv_ops: dict[str, list[dict]] = defaultdict(list)
    tag_ops: dict[str, list[dict]] = defaultdict(list)
    for op in operations:
        tag_ops[op["tag"]].append(op)
        for priv in op["privileges"]:
            priv_ops[priv].append(op)

    privileges = []
    for name, ops in sorted(priv_ops.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        tags = sorted({o["tag"] for o in ops})
        privileges.append(
            {"name": name, "operationCount": len(ops), "tags": tags}
        )

    tags = []
    for name, ops in sorted(tag_ops.items(), key=lambda kv: kv[0]):
        risk_counts = Counter(o["risk"] for o in ops)
        tags.append(
            {
                "name": name,
                "operationCount": len(ops),
                "read": risk_counts.get("read", 0),
                "mutating": risk_counts.get("mutating", 0),
                "destructive": risk_counts.get("destructive", 0),
            }
        )

    async_control = [o["id"] for o in operations if o["tag"] == "/v2/async-result"]
    risk_counts = Counter(o["risk"] for o in operations)
    meta = {
        "baseUrl": "/api/admin",
        "specTitle": (spec.get("info") or {}).get("title"),
        "specVersion": (spec.get("info") or {}).get("version"),
        "counts": {
            "operations": len(operations),
            "paths": len(paths),
            "tags": len(tags),
            "privileges": len(privileges),
            "read": risk_counts.get("read", 0),
            "mutating": risk_counts.get("mutating", 0),
            "destructive": risk_counts.get("destructive", 0),
            "async": sum(1 for o in operations if o["async"]),
            "unprivileged": sum(1 for o in operations if o["privilegeMode"] == "none"),
        },
    }
    return {
        "meta": meta,
        "privileges": privileges,
        "tags": tags,
        "asyncControl": async_control,
        "operations": operations,
    }


def assert_counts(inventory: dict) -> None:
    counts = inventory["meta"]["counts"]
    failed = []
    for key, expected in EXPECTED.items():
        actual = counts[key]
        if actual != expected:
            failed.append(f"{key}: expected {expected}, got {actual}")
    if failed:
        print("inventory count assertions failed:", file=sys.stderr)
        for line in failed:
            print("  " + line, file=sys.stderr)
        # Help debug risk splits
        if any(k in {"read", "mutating", "destructive"} for k, _ in ((f.split(":")[0], f) for f in failed)):
            dest = [o["id"] + " | " + o["summary"] for o in inventory["operations"] if o["risk"] == "destructive" and o["method"] != "DELETE"]
            print("destructive POSTs/PUTs:", file=sys.stderr)
            for line in dest:
                print("  " + line, file=sys.stderr)
        sys.exit(1)


def main() -> None:
    if not SPEC_PATH.exists():
        print(f"missing spec: {SPEC_PATH}", file=sys.stderr)
        sys.exit(1)
    spec = load_spec()
    inventory = build(spec)
    assert_counts(inventory)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(inventory, indent=2) + "\n")
    counts = inventory["meta"]["counts"]
    print(f"wrote {OUT_PATH}")
    print("counts:", json.dumps(counts, indent=2))


if __name__ == "__main__":
    main()
