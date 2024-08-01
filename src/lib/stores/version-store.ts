import { writable } from "svelte/store";

export const currentVersion = writable<string>("");
export const newVersionAvailable = writable<boolean>(false);
