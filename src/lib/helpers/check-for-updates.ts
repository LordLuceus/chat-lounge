import { env } from "$env/dynamic/public";
import { currentVersion, newVersionAvailable } from "$lib/stores";

export const setVersion = () => {
  currentVersion.set(env.PUBLIC_APP_VERSION);
};

export const checkForUpdates = () => {
  currentVersion.subscribe((version) => {
    if (!version) {
      return;
    }
    const storedVersion = localStorage.getItem("version");
    if (storedVersion === version) return;
    localStorage.setItem("version", version);
    newVersionAvailable.set(true);
  });
};
