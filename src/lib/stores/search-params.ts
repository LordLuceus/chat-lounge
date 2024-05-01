import { writable } from "svelte/store";

export interface SearchParams {
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export const searchParams = writable<SearchParams>({ search: "", sortBy: "", sortOrder: "" });
