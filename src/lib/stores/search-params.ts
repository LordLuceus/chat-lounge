import { writable } from "svelte/store";

export interface SearchParams {
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  visibility?: string;
  ownerOnly?: boolean;
}

export const searchParams = writable<SearchParams>({
  search: "",
  sortBy: "",
  sortOrder: "",
  visibility: "",
  ownerOnly: false
});
