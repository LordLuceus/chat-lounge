import { describe, expect, it } from "vitest";
import { createFullTextSearchCondition, getSearchQuery } from "./search-helpers";

describe("createFullTextSearchCondition", () => {
  it("matches everything when there is no search term", () => {
    const sql = createFullTextSearchCondition(undefined, ["c.name"]);
    expect(sql.sql).toBe("true");
    expect(sql.values).toEqual([]);
  });

  it("combines an exact phrase and a wildcard AND match per field", () => {
    const sql = createFullTextSearchCondition("letta code", ["c.name", "m.content"]);
    expect(sql.sql).toBe(
      "(MATCH(c.name) AGAINST(? IN BOOLEAN MODE) OR MATCH(c.name) AGAINST(? IN BOOLEAN MODE) OR " +
        "MATCH(m.content) AGAINST(? IN BOOLEAN MODE) OR MATCH(m.content) AGAINST(? IN BOOLEAN MODE))"
    );
    expect(sql.values).toEqual([
      '"letta code"',
      "+letta* +code*",
      '"letta code"',
      "+letta* +code*"
    ]);
  });

  it("passes combined column lists through to MATCH", () => {
    const sql = createFullTextSearchCondition("x", ["a.name, a.description"]);
    expect(sql.sql).toContain("MATCH(a.name, a.description)");
  });

  it("binds the search term rather than interpolating it", () => {
    const sql = createFullTextSearchCondition("'; DROP TABLE message; --", ["c.name"]);
    expect(sql.sql).not.toContain("DROP");
    expect(sql.values[0]).toBe('"\'; DROP TABLE message; --"');
  });
});

describe("getSearchQuery", () => {
  it("builds the scoring expression from phrase and wildcard forms", () => {
    expect(getSearchQuery("prof")).toBe('"prof" +prof*');
    expect(getSearchQuery("two words")).toBe('"two words" +two* +words*');
  });
});
