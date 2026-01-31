import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface AgentConfig {
  name: string;
  type: string;
  description?: string;
  capabilities?: string[];
  endpoint?: string;
  apiKey?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.clawdnet');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function getConfig(): AgentConfig | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading config:', error);
    return null;
  }
}

export function saveConfig(config: AgentConfig): void {
  try {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
}

export function configExists(): boolean {
  return fs.existsSync(CONFIG_FILE);
}