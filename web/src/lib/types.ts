export type Risk = "read" | "mutating" | "destructive";
export type PrivilegeMode = "one" | "any" | "none";

export type Parameter = {
  name: string;
  in: "query" | "path" | "header" | "cookie" | string;
  required: boolean;
  type: string;
  enum: string[] | null;
  default: unknown;
  description: string;
  example?: unknown;
};

export type Operation = {
  id: string;
  method: string;
  path: string;
  tag: string;
  summary: string;
  privileges: string[];
  privilegeMode: PrivilegeMode;
  risk: Risk;
  async: boolean;
  requestBody: string | null;
  resultSchema: string | null;
  resultIsList: boolean;
  parameters: Parameter[];
  responseCodes: string[];
};

export type Inventory = {
  meta: {
    baseUrl: string;
    specTitle?: string;
    specVersion?: string;
    counts: {
      operations: number;
      paths: number;
      tags: number;
      privileges: number;
      read: number;
      mutating: number;
      destructive: number;
      async: number;
      unprivileged: number;
    };
  };
  privileges: { name: string; operationCount: number; tags: string[] }[];
  tags: { name: string; operationCount: number; read: number; mutating: number; destructive: number }[];
  asyncControl: string[];
  operations: Operation[];
};

export type PrivilegeFlag = { use: boolean };

export type ServerInfo = {
  apiVersion: number;
  username: string;
  serverVersion: string;
  systemMode: string;
  product: string;
  namespaces: { name: string }[];
  privileges: Record<string, PrivilegeFlag>;
};

export type AdminStatusError = string | { error?: string; message?: string; code?: number };

export type AdminEnvelope = {
  status?: { errors?: AdminStatusError[]; Errors?: AdminStatusError[]; summary?: string };
  console?: string[];
  result?: unknown;
};

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

export type Preview = {
  allowed: boolean;
  mode: PrivilegeMode;
  required: string[];
  held: string[];
  missing: string[];
  simulated: boolean;
};

export type JournalEntry = {
  id?: string | number;
  type: "snapshot" | "journal";
  username?: string;
  createdAt?: string;
  operationId: string;
  method: string;
  path: string;
  url: string;
  risk: Risk;
  httpStatus?: number;
  rolledBack?: boolean;
  asyncTaskGUID?: string;
  error?: string;
  params?: unknown;
  body?: unknown;
  before?: unknown;
  after?: unknown;
};

export type Job = {
  guid: string;
  operationId: string;
  startedAt: string;
  status: string;
  result?: unknown;
  location?: string;
};
