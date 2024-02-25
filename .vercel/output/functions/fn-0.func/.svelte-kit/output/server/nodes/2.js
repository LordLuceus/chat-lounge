

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.CLaQjfeM.js","_app/immutable/chunks/scheduler.CYFynt7j.js","_app/immutable/chunks/index.iosNfj23.js","_app/immutable/chunks/index.D8mVmiTF.js"];
export const stylesheets = ["_app/immutable/assets/2.C3rRPyVt.css"];
export const fonts = [];
