/**
 * User config: load / save / merge with env overrides.
 *
 * Default location: ~/.notslop/config.json
 * Env overrides: ZEROENTROPY_API_KEY, ORTHOGONAL_API_KEY
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { type Config, DEFAULT_CONFIG } from "./types.js";

export const DEFAULT_CONFIG_DIR = join(homedir(), ".notslop");
export const DEFAULT_CONFIG_PATH = join(DEFAULT_CONFIG_DIR, "config.json");

export interface LoadConfigOptions {
  /** Override the config file path. */
  path?: string;
  /** If true, missing file is OK and DEFAULT_CONFIG is returned. */
  allowMissing?: boolean;
}

export function loadConfig(options: LoadConfigOptions = {}): Config {
  const path = options.path ?? DEFAULT_CONFIG_PATH;
  let fromFile: Partial<Config> = {};
  if (existsSync(path)) {
    try {
      fromFile = JSON.parse(readFileSync(path, "utf8")) as Partial<Config>;
    } catch (err) {
      throw new Error(`failed to parse ${path}: ${(err as Error).message}`);
    }
  } else if (!options.allowMissing) {
    // Fall through — caller decides whether to wizard-init.
  }

  const envOverrides: Partial<Config> = {};
  if (process.env.ZEROENTROPY_API_KEY) {
    envOverrides.zeroentropy_api_key = process.env.ZEROENTROPY_API_KEY;
  }
  if (process.env.ORTHOGONAL_API_KEY) {
    envOverrides.orthogonal_api_key = process.env.ORTHOGONAL_API_KEY;
  }

  return { ...DEFAULT_CONFIG, ...fromFile, ...envOverrides };
}

export function saveConfig(config: Config, path = DEFAULT_CONFIG_PATH): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function configExists(path = DEFAULT_CONFIG_PATH): boolean {
  return existsSync(path);
}
