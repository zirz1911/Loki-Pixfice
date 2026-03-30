import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface PixficeConfig {
  host: string;    // tmux host (default: "local")
  port: number;    // server port (default: 3456)
  session: string; // tmux session name (default: "loki-oracle")
}

const DEFAULTS: PixficeConfig = {
  host: "local",
  port: 3456,
  session: "loki-oracle",
};

const CONFIG_PATH = path.join(os.homedir(), ".config", "loki-pixfice", "config.json");

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidPort(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 65535;
}

export function loadConfig(): PixficeConfig {
  const cfg: PixficeConfig = { ...DEFAULTS };

  let raw: Record<string, unknown> = {};
  try {
    const text = fs.readFileSync(CONFIG_PATH, "utf-8");
    raw = JSON.parse(text);
  } catch {
    // File missing or invalid JSON → use defaults silently
    return cfg;
  }

  if ("host" in raw) {
    if (isNonEmptyString(raw.host)) {
      cfg.host = raw.host;
    } else {
      console.warn(`[loki-pixfice] config: invalid "host" (expected non-empty string), using default "${DEFAULTS.host}"`);
    }
  }

  if ("port" in raw) {
    if (isValidPort(raw.port)) {
      cfg.port = raw.port;
    } else {
      console.warn(`[loki-pixfice] config: invalid "port" (expected integer 1-65535), using default ${DEFAULTS.port}`);
    }
  }

  if ("session" in raw) {
    if (isNonEmptyString(raw.session)) {
      cfg.session = raw.session;
    } else {
      console.warn(`[loki-pixfice] config: invalid "session" (expected non-empty string), using default "${DEFAULTS.session}"`);
    }
  }

  // Warn on unknown keys
  for (const key of Object.keys(raw)) {
    if (!(key in DEFAULTS)) {
      console.warn(`[loki-pixfice] config: unknown field "${key}" — ignored`);
    }
  }

  return cfg;
}
