import { writable } from "svelte/store";

export const newConversation = writable<boolean>(false);
