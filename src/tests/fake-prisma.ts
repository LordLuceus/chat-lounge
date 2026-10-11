/* eslint-disable @typescript-eslint/no-explicit-any */
import { v4 as uuidv4 } from "uuid";

/**
 * A small in-memory stand-in for the Prisma client, covering the query shapes
 * the services use: equality and `in` filters, `OR`/`AND`, `some` on the
 * `conversationUsers` and `agentUsers` relations, `include` of `messages` and
 * `model`, `select`, single-field `orderBy`, nested `create`, and the usual
 * find/create/update/delete families. Timestamps come from a ticking clock so
 * creation order is deterministic.
 */

type Row = Record<string, any>;

export interface FakePrismaOptions {
  models?: Row[];
  users?: Row[];
}

const RELATIONS: Record<string, Record<string, { table: string; foreignKey: string }>> = {
  conversation: {
    conversationUsers: { table: "conversationUser", foreignKey: "conversationId" },
    messages: { table: "message", foreignKey: "conversationId" },
    sharedConversations: { table: "sharedConversation", foreignKey: "conversationId" }
  },
  agent: {
    agentUsers: { table: "agentUser", foreignKey: "agentId" }
  },
  sharedConversation: {
    sharedMessages: { table: "sharedMessage", foreignKey: "sharedConversationId" }
  }
};

const LOOKUPS: Record<string, Record<string, { table: string; localKey: string }>> = {
  conversation: { model: { table: "model", localKey: "modelId" } },
  message: { model: { table: "model", localKey: "modelId" } },
  agent: { preferredModel: { table: "model", localKey: "preferredModelId" } },
  folder: { user: { table: "user", localKey: "userId" } },
  apiKey: { user: { table: "user", localKey: "userId" } }
};

const DEFAULTS: Record<string, Row> = {
  conversation: {
    agentId: null,
    modelId: null,
    currentNode: null,
    isImporting: false,
    isPinned: false,
    folderId: null
  },
  message: { userId: null, modelId: null, parentId: null, isInternal: false },
  conversationUser: {},
  sharedConversation: { agentId: null },
  sharedMessage: { parentId: null },
  model: {
    reasoningType: "none",
    supportsTools: true,
    supportsImages: true,
    supportsVideo: false,
    deprecated: false,
    adaptiveThinking: null,
    reviewStatus: "approved",
    releaseDate: null
  },
  deletedModel: {},
  user: {
    email: null,
    image: null,
    useBaseInstructions: false,
    customBaseInstructions: null,
    isAdmin: false
  },
  folder: {},
  agent: {
    description: null,
    visibility: "private",
    type: "default",
    verbosity: "default",
    greeting: null,
    preferredModelId: null
  },
  agentUser: { lastUsedAt: null, isOwner: false },
  apiKey: {}
};

export function createFakePrisma(options: FakePrismaOptions = {}) {
  const tables: Record<string, Row[]> = Object.fromEntries(
    Object.keys(DEFAULTS).map((name) => [name, []])
  );
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 0, 1, 0, 0, 0, tick++));

  for (const model of options.models ?? []) {
    tables.model.push({ ...DEFAULTS.model, createdAt: now(), updatedAt: now(), ...model });
  }
  for (const user of options.users ?? []) {
    tables.user.push({ ...DEFAULTS.user, createdAt: now(), updatedAt: now(), ...user });
  }

  function matchesValue(actual: any, expected: any): boolean {
    if (expected !== null && typeof expected === "object" && !(expected instanceof Date)) {
      if ("in" in expected) return expected.in.includes(actual);
      if ("contains" in expected) return String(actual ?? "").includes(expected.contains);
      if ("not" in expected) return !matchesValue(actual, expected.not);
      if ("equals" in expected) return actual === expected.equals;
      throw new Error(`Unsupported filter ${JSON.stringify(expected)}`);
    }
    if (expected instanceof Date && actual instanceof Date) {
      return expected.getTime() === actual.getTime();
    }
    return actual === expected;
  }

  function matches(table: string, row: Row, where: Row | undefined): boolean {
    if (!where) return true;
    return Object.entries(where).every(([key, expected]) => {
      if (expected === undefined) return true;
      if (key === "OR") return (expected as Row[]).some((w) => matches(table, row, w));
      if (key === "AND") return (expected as Row[]).every((w) => matches(table, row, w));
      if (key === "NOT") return !matches(table, row, expected as Row);
      const relation = RELATIONS[table]?.[key];
      if (relation) {
        const related = tables[relation.table].filter((r) => r[relation.foreignKey] === row.id);
        if ("some" in expected)
          return related.some((r) => matches(relation.table, r, expected.some));
        if ("none" in expected)
          return !related.some((r) => matches(relation.table, r, expected.none));
        if ("every" in expected)
          return related.every((r) => matches(relation.table, r, expected.every));
        throw new Error(`Unsupported relation filter on ${key}`);
      }
      const lookup = LOOKUPS[table]?.[key];
      if (lookup) {
        // Filtering a relation by id alone is a foreign-key comparison; the
        // related row need not be seeded.
        const keys = expected === null ? [] : Object.keys(expected);
        if (keys.length === 1 && keys[0] === "id") {
          return matchesValue(row[lookup.localKey], expected.id);
        }
        const target = tables[lookup.table].find((r) => r.id === row[lookup.localKey]);
        return expected === null ? !target : !!target && matches(lookup.table, target, expected);
      }
      return matchesValue(row[key], expected);
    });
  }

  function sort(rows: Row[], orderBy: Row | Row[] | undefined): Row[] {
    if (!orderBy) return rows;
    const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
    return [...rows].sort((a, b) => {
      for (const clause of clauses) {
        const [field, raw] = Object.entries(clause)[0] as [string, any];
        const direction = typeof raw === "string" ? raw : raw.sort;
        const nulls = typeof raw === "string" ? undefined : raw.nulls;
        const av = a[field];
        const bv = b[field];
        if (av == null && bv == null) continue;
        if (av == null) return nulls === "last" ? 1 : -1;
        if (bv == null) return nulls === "last" ? -1 : 1;
        const cmp =
          av instanceof Date ? av.getTime() - bv.getTime() : av < bv ? -1 : av > bv ? 1 : 0;
        if (cmp !== 0) return direction === "desc" ? -cmp : cmp;
      }
      return 0;
    });
  }

  function shape(table: string, row: Row, args: Row | undefined): Row {
    let result: Row = { ...row };
    if (args?.select) {
      result = {};
      for (const [key, value] of Object.entries(args.select as Row)) {
        if (!value) continue;
        const relation = RELATIONS[table]?.[key];
        const lookup = LOOKUPS[table]?.[key];
        if (relation) {
          result[key] = query(relation.table, {
            ...(typeof value === "object" ? value : {}),
            where: {
              ...(typeof value === "object" ? value.where : {}),
              [relation.foreignKey]: row.id
            }
          });
        } else if (lookup) {
          const target = tables[lookup.table].find((r) => r.id === row[lookup.localKey]);
          result[key] = target
            ? shape(lookup.table, target, typeof value === "object" ? value : {})
            : null;
        } else {
          result[key] = row[key];
        }
      }
      return result;
    }
    if (args?.include) {
      for (const [key, value] of Object.entries(args.include as Row)) {
        if (!value) continue;
        const relation = RELATIONS[table]?.[key];
        const lookup = LOOKUPS[table]?.[key];
        if (relation) {
          result[key] = query(relation.table, {
            ...(typeof value === "object" ? value : {}),
            where: {
              ...(typeof value === "object" ? value.where : {}),
              [relation.foreignKey]: row.id
            }
          });
        } else if (lookup) {
          const target = tables[lookup.table].find((r) => r.id === row[lookup.localKey]);
          result[key] = target ? { ...target } : null;
        }
      }
    }
    return result;
  }

  function query(table: string, args: Row = {}): Row[] {
    let rows = tables[table].filter((row) => matches(table, row, args.where));
    rows = sort(rows, args.orderBy);
    if (args.skip) rows = rows.slice(args.skip);
    if (args.take !== undefined) rows = rows.slice(0, args.take);
    return rows.map((row) => shape(table, row, args));
  }

  function insert(table: string, data: Row): Row {
    const row: Row = { ...DEFAULTS[table] };
    const nested: Array<[string, Row]> = [];
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      const relation = RELATIONS[table]?.[key];
      if (relation && value && typeof value === "object" && "create" in value) {
        nested.push([key, value.create]);
        continue;
      }
      row[key] = value;
    }
    if (row.id === undefined) row.id = uuidv4();
    row.createdAt ??= now();
    row.updatedAt ??= now();
    tables[table].push(row);
    for (const [key, data] of nested) {
      const relation = RELATIONS[table][key];
      for (const item of Array.isArray(data) ? data : [data]) {
        insert(relation.table, { ...item, [relation.foreignKey]: row.id });
      }
    }
    return row;
  }

  function applyUpdate(row: Row, data: Row) {
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      row[key] = value;
    }
    row.updatedAt = now();
  }

  function notFound(table: string): Error {
    const error = new Error(`No ${table} found`);
    (error as any).code = "P2025";
    return error;
  }

  function delegate(table: string) {
    return {
      findMany: async (args: Row = {}) => query(table, args),
      findFirst: async (args: Row = {}) => query(table, { ...args, take: 1 })[0] ?? null,
      findFirstOrThrow: async (args: Row = {}) => {
        const row = query(table, { ...args, take: 1 })[0];
        if (!row) throw notFound(table);
        return row;
      },
      findUnique: async (args: Row = {}) => query(table, { ...args, take: 1 })[0] ?? null,
      findUniqueOrThrow: async (args: Row = {}) => {
        const row = query(table, { ...args, take: 1 })[0];
        if (!row) throw notFound(table);
        return row;
      },
      count: async (args: Row = {}) => query(table, args).length,
      create: async (args: Row) => shape(table, insert(table, args.data), args),
      createMany: async (args: Row) => {
        for (const data of args.data) insert(table, data);
        return { count: args.data.length };
      },
      update: async (args: Row) => {
        const row = tables[table].find((r) => matches(table, r, args.where));
        if (!row) throw notFound(table);
        applyUpdate(row, args.data);
        return shape(table, row, args);
      },
      updateMany: async (args: Row) => {
        const rows = tables[table].filter((r) => matches(table, r, args.where));
        rows.forEach((row) => applyUpdate(row, args.data));
        return { count: rows.length };
      },
      delete: async (args: Row) => {
        const index = tables[table].findIndex((r) => matches(table, r, args.where));
        if (index === -1) throw notFound(table);
        const [row] = tables[table].splice(index, 1);
        return row;
      },
      deleteMany: async (args: Row = {}) => {
        const before = tables[table].length;
        tables[table] = tables[table].filter((r) => !matches(table, r, args.where));
        return { count: before - tables[table].length };
      }
    };
  }

  const prisma: Record<string, ReturnType<typeof delegate>> & { $tables: Record<string, Row[]> } =
    Object.assign(Object.fromEntries(Object.keys(DEFAULTS).map((name) => [name, delegate(name)])), {
      get $tables() {
        return tables;
      }
    }) as any;

  return prisma;
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;
