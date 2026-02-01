import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface AgentConfig {
  name: string;
  handle?: string;
  type: string;
  description?: string;
  capabilities?: string[];
  skills?: string[];
  endpoint?: string;
  apiKey?: string;
  agentId?: string;
  verified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GlobalConfig {
  apiKey?: string;
  defaultEndpoint?: string;
  colorOutput?: boolean;
  jsonOutput?: boolean;
}

const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.clawdnet');
const GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, 'config.json');
const LOCAL_CONFIG_FILE = '.clawdnet.json';

export function ensureConfigDir(): void {
  if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
    fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
  }
}

export function getConfigPath(): string {
  // Check for local config first
  if (fs.existsSync(LOCAL_CONFIG_FILE)) {
    return LOCAL_CONFIG_FILE;
  }
  return GLOBAL_CONFIG_FILE;
}

export function getConfig(): AgentConfig | null {
  try {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
      return null;
    }
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

export function getGlobalConfig(): GlobalConfig {
  try {
    const globalPath = path.join(GLOBAL_CONFIG_DIR, 'settings.json');
    if (!fs.existsSync(globalPath)) {
      return {};
    }
    const data = fs.readFileSync(globalPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

export function saveGlobalConfig(config: GlobalConfig): void {
  ensureConfigDir();
  const globalPath = path.join(GLOBAL_CONFIG_DIR, 'settings.json');
  fs.writeFileSync(globalPath, JSON.stringify(config, null, 2));
}

export function saveConfig(config: AgentConfig, local: boolean = false): void {
  try {
    const configPath = local ? LOCAL_CONFIG_FILE : GLOBAL_CONFIG_FILE;
    if (!local) {
      ensureConfigDir();
    }
    config.updatedAt = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    throw error;
  }
}

export function configExists(): boolean {
  return fs.existsSync(LOCAL_CONFIG_FILE) || fs.existsSync(GLOBAL_CONFIG_FILE);
}

export function isLocalConfig(): boolean {
  return fs.existsSync(LOCAL_CONFIG_FILE);
}

export function getConfigDir(): string {
  return GLOBAL_CONFIG_DIR;
}
