import type { Visibility } from "$lib/types/db";

export type SortOrder = "ASC" | "DESC";
export interface RequestParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder: SortOrder;
  search?: string;
  visibility?: Visibility;
  ownerOnly?: boolean;
  folderId?: string;
}

export class QueryParamsProcessor {
  private params: RequestParams;
  private defaultLimit: number = 10;
  private defaultPage: number = 1;
  private defaultSortOrder: SortOrder = "ASC";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(params: Record<string, any>) {
    this.params = this.parseParams(params);
  }

  // Parses and validates incoming query parameters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseParams(params: Record<string, any>): RequestParams {
    return {
      page: parseInt(params.page) || this.defaultPage,
      limit: parseInt(params.limit) || this.defaultLimit,
      sortBy: params.sortBy || "",
      sortOrder: this.validateSortOrder(params.sortOrder),
      search: params.search || "",
      visibility: params.visibility,
      ownerOnly: params.ownerOnly === "true",
      folderId: params.folderId
    };
  }

  // Ensure the sort order is either 'ASC' or 'DESC'
  private validateSortOrder(order?: string): SortOrder {
    const upperCaseOrder = order?.toUpperCase() as SortOrder;
    return upperCaseOrder === "DESC" ? "DESC" : this.defaultSortOrder;
  }

  // --- DRIZZLE SPECIFIC METHODS ---

  // Can be used to generate SQL query limits and offsets
  public getPagination() {
    const offset = (this.params.page - 1) * this.params.limit;
    return {
      limit: this.params.limit,
      offset
    };
  }

  // Generates SQL ORDER BY clause
  public getSorting(table: string) {
    if (this.params.sortBy) {
      const sanitizedSortBy = this.params.sortBy.replace(/[^a-zA-Z0-9_,]/g, "");
      if (sanitizedSortBy.includes(",")) {
        const sortColumns = sanitizedSortBy.split(",");
        return sortColumns
          .map((column) => `${table}.${column} ${this.params.sortOrder}`)
          .join(", ");
      }
      return `${table}.${sanitizedSortBy} ${this.params.sortOrder}`;
    }
    return undefined;
  }

  // Generates SQL search condition
  public getSearchQuery(columnNames: string[]) {
    if (!this.params.search) {
      return undefined;
    }

    const sanitizedSearch = this.params.search.replace(/[^a-zA-Z0-9_ ]/g, "");
    const searchQuery = columnNames
      .map((column) => `lower(${column}) LIKE '%${sanitizedSearch}%'`)
      .join(" OR ");
    return `(${searchQuery})`;
  }

  // --- PRISMA SPECIFIC METHODS ---

  // Returns Prisma pagination parameters
  public getPrismaPagination() {
    const skip = (this.params.page - 1) * this.params.limit;
    return {
      take: this.params.limit,
      skip
    };
  }

  // Returns Prisma orderBy object
  public getPrismaOrderBy() {
    if (!this.params.sortBy) {
      return undefined;
    }

    const sanitizedSortBy = this.params.sortBy.replace(/[^a-zA-Z0-9_,]/g, "");
    const direction = this.params.sortOrder.toLowerCase() as "asc" | "desc";

    if (sanitizedSortBy.includes(",")) {
      // Multi-field sorting
      const sortColumns = sanitizedSortBy.split(",");
      const orderBy: Record<string, "asc" | "desc">[] = sortColumns.map((column) => ({
        [column]: direction
      }));
      return orderBy;
    }

    // Single field sorting
    return {
      [sanitizedSortBy]: direction
    };
  }

  // Returns Prisma search conditions for WHERE clause
  public getPrismaSearchFilter(columnNames: string[]) {
    if (!this.params.search || !this.params.search.trim()) {
      return {};
    }

    const sanitizedSearch = this.params.search.replace(/[^a-zA-Z0-9_ ]/g, "");

    // Create an OR condition for each column
    const searchConditions = columnNames.map((column) => ({
      [column]: {
        contains: sanitizedSearch,
        mode: "insensitive"
      }
    }));

    return {
      OR: searchConditions
    };
  }

  // Returns a complete Prisma where object with all filters
  public getPrismaWhereCondition(columnNames: string[], userId?: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    // Add search if specified
    if (this.params.search) {
      Object.assign(where, this.getPrismaSearchFilter(columnNames));
    }

    // Add visibility if specified
    if (this.params.visibility) {
      where.visibility = this.params.visibility;
    }

    // Add folder filter if specified
    if (this.params.folderId) {
      where.folderId = this.params.folderId;
    }

    // Add owner filter if specified
    if (this.params.ownerOnly && userId) {
      where.userId = userId;
    }

    return where;
  }

  // --- COMMON METHODS ---

  public getVisibility() {
    return this.params.visibility || null;
  }

  public getOwnerOnly() {
    return this.params.ownerOnly;
  }

  public getFolderId() {
    return this.params.folderId;
  }
}
