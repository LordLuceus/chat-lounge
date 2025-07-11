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

  // Can be used to generate SQL query limits and offsets
  public getPagination() {
    const offset = (this.params.page - 1) * this.params.limit;
    return {
      limit: this.params.limit,
      offset
    };
  }

  public getSorting() {
    if (this.params.sortBy) {
      const sanitizedSortBy = this.params.sortBy.replace(/[^a-zA-Z0-9_,]/g, "");

      return { sortBy: sanitizedSortBy, sortOrder: this.params.sortOrder };
    }
    return undefined;
  }

  // Generates SQL search condition
  public getSearchQuery() {
    if (!this.params.search) {
      return undefined;
    }

    const sanitizedSearch = this.params.search.replace(/[^a-zA-Z0-9_ ]/g, "");
    return sanitizedSearch;
  }

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
