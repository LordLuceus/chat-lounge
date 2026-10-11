import { describe, expect, it } from "vitest";
import { QueryParamsProcessor } from "./query-params-processor";

describe("QueryParamsProcessor", () => {
  it("applies defaults for missing or invalid values", () => {
    const processor = new QueryParamsProcessor({ page: "abc", sortOrder: "sideways" });
    expect(processor.getPagination()).toEqual({ limit: 10, offset: 0 });
    expect(processor.getSorting()).toBeUndefined();
    expect(processor.getSearchQuery()).toBeUndefined();
    expect(processor.getVisibility()).toBeNull();
    expect(processor.getOwnerOnly()).toBe(false);
    expect(processor.getFolderId()).toBeUndefined();
    expect(processor.getAllFolders()).toBe(false);
  });

  it("computes offsets from page and limit", () => {
    expect(new QueryParamsProcessor({ page: "3", limit: "20" }).getPagination()).toEqual({
      limit: 20,
      offset: 40
    });
  });

  it("sanitises sort fields and only allows ASC or DESC", () => {
    expect(
      new QueryParamsProcessor({ sortBy: "name; DROP TABLE", sortOrder: "desc" }).getSorting()
    ).toEqual({ sortBy: "nameDROPTABLE", sortOrder: "DESC" });
    expect(new QueryParamsProcessor({ sortBy: "createdAt" }).getSorting()).toEqual({
      sortBy: "createdAt",
      sortOrder: "ASC"
    });
  });

  it("strips punctuation from search terms", () => {
    expect(new QueryParamsProcessor({ search: 'let\'s "go" now!' }).getSearchQuery()).toBe(
      "lets go now"
    );
  });

  it("reads boolean flags from their string form only", () => {
    const processor = new QueryParamsProcessor({
      ownerOnly: "true",
      allFolders: "yes",
      folderId: "f1",
      visibility: "public"
    });
    expect(processor.getOwnerOnly()).toBe(true);
    expect(processor.getAllFolders()).toBe(false);
    expect(processor.getFolderId()).toBe("f1");
    expect(processor.getVisibility()).toBe("public");
  });
});
