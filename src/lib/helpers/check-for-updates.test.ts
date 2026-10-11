import { currentVersion, newVersionAvailable } from "$lib/stores";
import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$env/dynamic/public", () => ({ env: { PUBLIC_APP_VERSION: "2.3.4" } }));

const { checkForUpdates, setVersion } = await import("./check-for-updates");

describe("version checks", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value)
    });
    currentVersion.set("");
    newVersionAvailable.set(false);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("publishes the version from the environment", () => {
    setVersion();
    expect(get(currentVersion)).toBe("2.3.4");
  });

  it("flags a new version the first time it is seen, then remembers it", () => {
    storage.set("version", "2.3.3");
    checkForUpdates();
    setVersion();
    expect(get(newVersionAvailable)).toBe(true);
    expect(storage.get("version")).toBe("2.3.4");

    newVersionAvailable.set(false);
    currentVersion.set("2.3.4");
    expect(get(newVersionAvailable)).toBe(false);
  });

  it("does nothing while the version is unknown", () => {
    checkForUpdates();
    expect(get(newVersionAvailable)).toBe(false);
    expect(storage.has("version")).toBe(false);
  });
});
