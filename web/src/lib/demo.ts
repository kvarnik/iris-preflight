import type { AdminEnvelope, CallResult, JournalEntry, ServerInfo } from "./types";
import { INFO_TO_PRIVILEGE } from "./privileges";

const DEMO_KEY = "iris-preflight-demo";
const JOURNAL_KEY = "iris-preflight-demo-journal";

export type DemoPersona = "superuser" | "operator" | "secure";

const PERSONAS: Record<
  DemoPersona,
  { username: string; privileges: string[] }
> = {
  superuser: {
    username: "SuperUser",
    privileges: Object.keys(INFO_TO_PRIVILEGE),
  },
  operator: {
    username: "Operator",
    privileges: ["Operate"],
  },
  secure: {
    username: "SecureAdmin",
    privileges: ["Secure", "FileSystemAccess"],
  },
};

export function isDemoBuild(): boolean {
  return import.meta.env.VITE_DEMO === "true";
}

export function isDemoMode(): boolean {
  if (isDemoBuild()) return true;
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("demo") === "1") return true;
  return window.sessionStorage.getItem(DEMO_KEY) === "1";
}

export function enableDemoMode(): void {
  window.sessionStorage.setItem(DEMO_KEY, "1");
}

export function disableDemoMode(): void {
  window.sessionStorage.removeItem(DEMO_KEY);
}

function privilegeMap(keys: string[]): ServerInfo["privileges"] {
  const all = Object.keys(INFO_TO_PRIVILEGE);
  const held = new Set(keys);
  const privileges: ServerInfo["privileges"] = {};
  for (const key of all) privileges[key] = { use: held.has(key) };
  return privileges;
}

export function demoInfo(persona: DemoPersona = "superuser"): ServerInfo {
  const spec = PERSONAS[persona];
  return {
    apiVersion: 2,
    username: spec.username,
    serverVersion: "IRIS for UNIX (Demo, no instance) 2026.2",
    systemMode: "DEMO",
    product: "iris",
    namespaces: [{ name: "%SYS" }, { name: "USER" }],
    privileges: privilegeMap(spec.privileges),
  };
}

function okEnvelope(result: unknown): AdminEnvelope {
  return { status: { errors: [], summary: "" }, console: [], result };
}

function success(result: unknown, status = 200, extra: Partial<CallResult> = {}): CallResult {
  const envelope = okEnvelope(result);
  return {
    ok: true,
    status,
    envelope,
    raw: envelope,
    location: extra.location ?? null,
    asyncTaskGUID: extra.asyncTaskGUID ?? null,
    error: null,
    privilegeDenied: false,
  };
}

function failure(status: number, message: string): CallResult {
  const envelope: AdminEnvelope = {
    status: { errors: [{ error: message, code: status }], summary: message },
    console: [],
    result: {},
  };
  return {
    ok: false,
    status,
    envelope,
    raw: envelope,
    location: null,
    asyncTaskGUID: null,
    error: message,
    privilegeDenied: status === 403,
  };
}

type Named = Record<string, unknown> & { Name: string };

type AsyncTask = {
  Id: string;
  RunningState: string;
  HasEnded: boolean;
  polls: number;
};

type Store = {
  databases: Named[];
  namespaces: Named[];
  users: Named[];
  roles: Named[];
  webApps: Named[];
  processes: Named[];
  devices: Named[];
  tasks: Named[];
  journalSettings: Record<string, unknown>;
  dashboard: Record<string, unknown>;
  asyncTasks: Record<string, AsyncTask>;
};

const ADMIN_RESOURCES = Object.values(INFO_TO_PRIVILEGE).map((token) => ({
  Name: token.replace(/:U$/, ""),
  Permissions: "U",
}));

function seed(): Store {
  return {
    databases: [
      { Name: "IRISSYS", Directory: "/usr/irissys/mgr/", Status: "Mounted/RW", MountAtStartup: true },
      { Name: "IRISLIB", Directory: "/usr/irissys/mgr/irislib/", Status: "Mounted/RO", MountAtStartup: true },
      { Name: "IRISTEMP", Directory: "/usr/irissys/mgr/iristemp/", Status: "Mounted/RW", MountAtStartup: true },
      { Name: "USER", Directory: "/usr/irissys/mgr/user/", Status: "Mounted/RW", MountAtStartup: true },
    ],
    namespaces: [
      { Name: "%SYS", Globals: "IRISSYS", Routines: "IRISSYS", Library: "IRISLIB", TempGlobals: "IRISTEMP" },
      { Name: "USER", Globals: "USER", Routines: "USER", TempGlobals: "IRISTEMP" },
    ],
    users: [
      {
        Name: "SuperUser",
        FullName: "Demonstration SuperUser",
        Enabled: true,
        Roles: ["%All"],
        NameSpace: "USER",
        AccountNeverExpires: true,
      },
      {
        Name: "Operator",
        FullName: "Demonstration Operator",
        Enabled: true,
        Roles: ["%Operator"],
        NameSpace: "USER",
      },
      {
        Name: "SecureAdmin",
        FullName: "Demonstration Security Admin",
        Enabled: true,
        Roles: ["%Admin_Secure"],
        NameSpace: "%SYS",
      },
    ],
    roles: [
      { Name: "%All", Description: "The Super-User Role", Resources: ADMIN_RESOURCES },
      { Name: "%Manager", Description: "System Managers", Resources: ADMIN_RESOURCES },
      {
        Name: "%Operator",
        Description: "System Operators",
        Resources: [{ Name: "%Admin_Operate", Permissions: "U" }],
      },
      {
        Name: "%Admin_Secure",
        Description: "Security administration",
        Resources: [
          { Name: "%Admin_Secure", Permissions: "U" },
          { Name: "%Admin_FileSystemAccess", Permissions: "U" },
        ],
      },
      {
        Name: "%Developer",
        Description: "A Role owned by all Developers",
        Resources: [{ Name: "%Development", Permissions: "U" }],
      },
    ],
    webApps: [
      { Name: "/csp/preflight", CookiePath: "/csp/preflight/", Enabled: true, Description: "IRIS Preflight static UI" },
      { Name: "/api/preflight", DispatchClass: "Preflight.REST", Enabled: true },
      { Name: "/api/admin", DispatchClass: "%Api.Admin.v2", Enabled: true },
      { Name: "/csp/sys", Enabled: true, Description: "System Management Portal" },
    ],
    processes: [
      { Pid: 1, Name: "CONTROL", Namespace: "%SYS", Routine: "CONTROL", State: "RUN" },
      { Pid: 21, Name: "WRTDMN", Namespace: "%SYS", Routine: "WRTDMN", State: "RUN" },
      { Pid: 88, Name: "SuperUser", Namespace: "USER", Routine: "%SYS.cspServer", State: "READ" },
    ],
    devices: [
      { Name: "TERM", Type: "TRM", Description: "Terminal" },
      { Name: "|TCP|1972", Type: "TCP", Description: "SuperServer" },
    ],
    tasks: [
      { Name: "Backup", Type: "Backup", Suspended: false, Reschedule: true },
      { Name: "Integrity Check", Type: "IntegrityCheck", Suspended: false },
    ],
    journalSettings: {
      CurrentDirectory: "/usr/irissys/mgr/journal/",
      AlternateDirectory: "/usr/irissys/mgr/journal/",
      FileSizeLimit: 1024,
      FreezeOnError: false,
    },
    dashboard: {
      Performance: { GlobalRefsPerSecond: 1240, GlobalSetKill: 88, DiskReads: 12 },
      Status: { UpTime: "0 days 00:42:00", LastBackup: "Never", SystemMonitor: "OK" },
      SystemUsage: { DatabaseSpace: "72%", JournalSpace: "4%", LockTable: "1%" },
      Alerts: [],
      Licensing: { LicenseUnits: 1, CurrentUsers: 1 },
      UpcomingTasks: [],
    },
    asyncTasks: {},
  };
}

let store: Store | null = null;

function db(): Store {
  if (!store) store = seed();
  return store;
}

function parse(pathAndQuery: string): { path: string; query: URLSearchParams } {
  const q = pathAndQuery.indexOf("?");
  if (q === -1) return { path: pathAndQuery, query: new URLSearchParams() };
  return { path: pathAndQuery.slice(0, q), query: new URLSearchParams(pathAndQuery.slice(q + 1)) };
}

function findNamed(list: Named[], name: string | null): Named | undefined {
  if (!name) return undefined;
  return list.find((row) => String(row.Name) === name);
}

function upsert(list: Named[], name: string, body: unknown): Named {
  const next: Named = {
    ...(typeof body === "object" && body ? (body as Named) : {}),
    Name: name,
  };
  const index = list.findIndex((row) => row.Name === name);
  if (index === -1) list.push(next);
  else list[index] = { ...list[index], ...next };
  return list.find((row) => row.Name === name)!;
}

function requireName(query: URLSearchParams, field = "name"): string | CallResult {
  const value = query.get(field);
  if (!value) return failure(400, `ERROR #40300: Query parameter '${field}' is required.`);
  return value;
}

const ASYNC_HINTS = [
  "/compact",
  "/defragment",
  "/expand-volume",
  "/integrity-check",
  "/modify-size",
  "/truncate",
  "/copy-mappings",
  "/enable-interop",
  "/ldap/test",
  "/audit/record",
];

function isAsyncPath(path: string): boolean {
  return ASYNC_HINTS.some((hint) => path.includes(hint));
}

function newGuid(): string {
  return `demo-${Date.now().toString(16)}-${Math.floor(Math.random() * 1e6).toString(16)}`;
}

export async function demoAdminCall(method: string, pathAndQuery: string, body?: unknown): Promise<CallResult> {
  const verb = method.toUpperCase();
  const { path, query } = parse(pathAndQuery);
  const data = db();

  if (path === "/info" && verb === "GET") return success(demoInfo("superuser"));

  if (path === "/v2/databases" && verb === "GET") return success(data.databases);
  if (path === "/v2/database") {
    const name = requireName(query);
    if (typeof name !== "string") return name;
    if (verb === "GET") {
      const row = findNamed(data.databases, name);
      return row ? success(row) : failure(404, `Database '${name}' not found.`);
    }
    if (verb === "PUT") return success(upsert(data.databases, name, body));
    if (verb === "DELETE") {
      const before = data.databases.length;
      data.databases = data.databases.filter((row) => row.Name !== name);
      return before === data.databases.length ? failure(404, `Database '${name}' not found.`) : success({ deleted: name });
    }
  }

  if (path === "/v2/namespaces" && verb === "GET") return success(data.namespaces);
  if (path === "/v2/namespace") {
    const name = requireName(query);
    if (typeof name !== "string") return name;
    if (verb === "GET") {
      const row = findNamed(data.namespaces, name);
      return row ? success(row) : failure(404, `Namespace '${name}' not found.`);
    }
    if (verb === "PUT") return success(upsert(data.namespaces, name, body));
    if (verb === "DELETE") {
      data.namespaces = data.namespaces.filter((row) => row.Name !== name);
      return success({ deleted: name });
    }
  }

  if (path === "/v2/security/users" && verb === "GET") return success(data.users);
  if (path === "/v2/security/user") {
    const name = requireName(query);
    if (typeof name !== "string") return name;
    if (verb === "GET") {
      const row = findNamed(data.users, name);
      return row ? success(row) : failure(404, `User '${name}' not found.`);
    }
    if (verb === "PUT") return success(upsert(data.users, name, body));
    if (verb === "DELETE") {
      data.users = data.users.filter((row) => row.Name !== name);
      return success({ deleted: name });
    }
  }

  if (path === "/v2/security/roles" && verb === "GET") return success(data.roles);
  if (path === "/v2/security/role") {
    const name = requireName(query);
    if (typeof name !== "string") return name;
    const row = findNamed(data.roles, name);
    if (verb === "GET") return row ? success(row) : failure(404, `Role '${name}' not found.`);
    if (verb === "PUT") return success(upsert(data.roles, name, body));
  }

  if (path === "/v2/web-apps" && verb === "GET") return success(data.webApps);
  if (path === "/v2/web-app") {
    const name = requireName(query);
    if (typeof name !== "string") return name;
    if (verb === "GET") {
      const row = findNamed(data.webApps, name);
      return row ? success(row) : failure(404, `Web application '${name}' not found.`);
    }
    if (verb === "PUT") return success(upsert(data.webApps, name, body));
  }

  if (path === "/v2/processes" && verb === "GET") return success(data.processes);
  if (path === "/v2/devices" && verb === "GET") return success(data.devices);
  if (path === "/v2/tasks" && verb === "GET") return success(data.tasks);
  if (path === "/v2/journal/settings" && verb === "GET") return success(data.journalSettings);
  if (path === "/v2/monitor/dashboard/main" && verb === "GET") return success(data.dashboard);
  if (path === "/v2/locks" && verb === "GET") return success([]);
  if (path === "/v2/database-dirs" && verb === "GET") {
    return success(data.databases.map((row) => ({ Directory: row.Directory, Name: row.Name })));
  }
  if (path === "/v2/ext-lang-servers" && verb === "GET") {
    return success([{ Name: "%Java Server", Type: "Java", Enabled: true }]);
  }

  if (path === "/v2/async-results" && verb === "GET") return success(Object.values(data.asyncTasks));
  if (path === "/v2/async-result") {
    const id = requireName(query, "id");
    if (typeof id !== "string") return id;
    const task = data.asyncTasks[id];
    if (!task) return failure(404, `ERROR #5809: Object to Load not found, class '%Api.Admin.Util.AsyncTask', ID '${id}'`);
    task.polls += 1;
    if (task.polls >= 2 && task.RunningState === "running") {
      task.RunningState = "done";
      task.HasEnded = true;
    }
    return success({ Id: task.Id, RunningState: task.RunningState, HasEnded: task.HasEnded });
  }
  if (path.startsWith("/v2/async-result/") && verb === "POST") {
    const id = requireName(query, "id");
    if (typeof id !== "string") return id;
    const action = path.split("/").pop() || "";
    const task = data.asyncTasks[id] || { Id: id, RunningState: "running", HasEnded: false, polls: 0 };
    if (action === "cancel") {
      task.RunningState = "cancelled";
      task.HasEnded = true;
    } else if (action === "pause") task.RunningState = "paused";
    else if (action === "resume") task.RunningState = "running";
    data.asyncTasks[id] = task;
    return success(task);
  }

  if (verb === "POST" && isAsyncPath(path)) {
    const guid = newGuid();
    data.asyncTasks[guid] = { Id: guid, RunningState: "running", HasEnded: false, polls: 0 };
    return success({ AsyncTaskGUID: guid }, 202, {
      asyncTaskGUID: guid,
      location: `/api/admin/v2/async-result?id=${guid}`,
    });
  }

  if (verb === "GET") {
    const name = query.get("name") || query.get("id") || query.get("dir") || query.get("file");
    return success({
      Demo: true,
      Path: path,
      Query: Object.fromEntries(query.entries()),
      Name: name,
      Message: "Synthetic demo payload. No InterSystems instance is connected.",
    });
  }

  if (verb === "PUT" || verb === "POST" || verb === "PATCH") {
    return success({
      Demo: true,
      applied: true,
      Path: path,
      Method: verb,
      Body: body ?? null,
      Message: "Write accepted in the browser demo. Nothing was changed on a live IRIS system.",
    });
  }

  if (verb === "DELETE") {
    return success({ Demo: true, deleted: true, Path: path });
  }

  return failure(405, `Demo mock does not handle ${verb} ${path}`);
}

function readJournal(): JournalEntry[] {
  try {
    const raw = window.sessionStorage.getItem(JOURNAL_KEY);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch {
    return [];
  }
}

function writeJournal(rows: JournalEntry[]): void {
  window.sessionStorage.setItem(JOURNAL_KEY, JSON.stringify(rows));
}

export async function demoPreflightFetch(path: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();
  const jsonHeaders = { "Content-Type": "application/json" };
  let rows = readJournal();

  if (path === "/ping" && method === "GET") {
    return new Response(JSON.stringify({ status: "ok", username: "demo", namespace: "DEMO" }), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  if (path === "/entries" && method === "GET") {
    return new Response(JSON.stringify(rows), { status: 200, headers: jsonHeaders });
  }

  if (path === "/entries" && method === "POST") {
    const body = init?.body ? (JSON.parse(String(init.body)) as JournalEntry) : {};
    const saved: JournalEntry = {
      ...(body as JournalEntry),
      id: Date.now(),
      createdAt: new Date().toISOString(),
      username: "demo",
    };
    rows = [saved, ...rows];
    writeJournal(rows);
    return new Response(JSON.stringify(saved), { status: 201, headers: jsonHeaders });
  }

  const match = /^\/entries\/([^/]+)$/.exec(path);
  if (match && method === "PUT") {
    const id = match[1];
    const patch = init?.body ? (JSON.parse(String(init.body)) as Partial<JournalEntry>) : {};
    rows = rows.map((row) => (String(row.id) === id ? { ...row, ...patch } : row));
    writeJournal(rows);
    const saved = rows.find((row) => String(row.id) === id) || patch;
    return new Response(JSON.stringify(saved), { status: 200, headers: jsonHeaders });
  }

  return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: jsonHeaders });
}
