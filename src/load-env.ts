import dotenv from "dotenv";

let loaded = false;

/** Load `.env` once without dotenv marketing / injection tips in stdout. */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  dotenv.config({ quiet: true });
}
