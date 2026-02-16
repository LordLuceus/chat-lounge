import { Prisma } from "@prisma/client";

/**
 * Creates a Prisma SQL fragment for full-text search with both exact phrase
 * and wildcard matching across specified fields.
 *
 * @param search - Search term (undefined returns `true` for no filtering)
 * @param fields - Array of field references for MATCH clauses
 *   - Single column: ['f.name'] generates MATCH(f.name)
 *   - Multiple columns combined: ['a.name, a.description'] generates MATCH(a.name, a.description)
 *   - Separate columns: ['c.name', 'm.content'] generates MATCH(c.name) OR MATCH(m.content)
 * @returns Prisma.sql fragment for use in WHERE clause
 *
 * @example
 * // Single field search
 * createFullTextSearchCondition(search, ['f.name'])
 *
 * // Combined column search (searches across both columns together)
 * createFullTextSearchCondition(search, ['a.name, a.description'])
 *
 * // Separate column search (searches each column independently with OR)
 * createFullTextSearchCondition(search, ['c.name', 'm.content'])
 *
 * // Search behavior:
 * // - "letta code" (quoted) → exact phrase match
 * // - letta code (unquoted) → partial match requiring BOTH words (+*letta* +*code*)
 * // - prof → partial match (professor, profession, etc.)
 */
export function createFullTextSearchCondition(
  search: string | undefined,
  fields: string[]
): Prisma.Sql {
  if (!search) {
    return Prisma.sql`true`;
  }

  const exactMatch = '"' + search + '"';
  // Use AND logic (+ prefix) for wildcards to require all words to be present
  const wildcardMatch = "+" + search.split(" ").join("* +") + "*";

  const conditions = fields.flatMap((field) => [
    Prisma.sql`MATCH(${Prisma.raw(field)}) AGAINST(${exactMatch} IN BOOLEAN MODE)`,
    Prisma.sql`MATCH(${Prisma.raw(field)}) AGAINST(${wildcardMatch} IN BOOLEAN MODE)`
  ]);

  // Join all conditions with OR
  return Prisma.sql`(${Prisma.join(conditions, " OR ")})`;
}
