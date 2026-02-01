import * as readline from 'readline';
import ora from 'ora';
import { getConfig, saveConfig, configExists } from '../lib/config';
import { updateAgent } from '../lib/api';
import { colors, logSuccess, logError, logWarning, logTip, logCommand, outputJson, isJsonMode, logTitle, logField } from '../lib/output';

export interface UpdateOptions {
  json?: boolean;
  name?: string;
  handle?: string;
  type?: string;
  description?: string;
  capabilities?: string;
  skills?: string;
  endpoint?: string;
  interactive?: boolean;
}

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl: readline.Interface, prompt: string, current?: string): Promise<string> {
  const displayPrompt = current 
    ? `${prompt} ${colors.dim(`[${current}]`)}: `
    : `${prompt}: `;
  return new Promise((resolve) => {
    rl.question(displayPrompt, (answer) => {
      resolve(answer || current || '');
    });
  });
}

export async function updateCommand(options: UpdateOptions = {}): Promise<void> {
  if (!configExists()) {
    if (isJsonMode()) {
      outputJson({ success: false, error: 'No configuration found' });
    } else {
      logWarning('No configuration found');
      logTip('Initialize your agent first:');
      logCommand('clawdnet init');
    }
    process.exit(1);
  }

  const config = getConfig();
  if (!config) {
    if (isJsonMode()) {
      outputJson({ success: false, error: 'Error reading configuration' });
    } else {
      logError('Error reading configuration');
    }
    process.exit(1);
  }

  let updates: Partial<typeof config> = {};

  // Check if any options were passed
  const hasOptions = options.name || options.handle || options.type || 
                     options.description || options.capabilities || 
                     options.skills || options.endpoint;

  if (options.interactive || !hasOptions) {
    // Interactive mode
    if (!isJsonMode()) {
      logTitle('📝 Update Agent');
      console.log(colors.dim('Press Enter to keep current value\n'));
    }

    const rl = createReadlineInterface();

    try {
      const name = await question(rl, colors.cyan('Name'), config.name);
      const handle = await question(rl, colors.cyan('Handle'), config.handle);
      const type = await question(rl, colors.cyan('Type'), config.type);
      const description = await question(rl, colors.cyan('Description'), config.description);
      const capabilities = await question(rl, colors.cyan('Capabilities'), config.capabilities?.join(', '));
      const skills = await question(rl, colors.cyan('Skills'), config.skills?.join(', '));
      const endpoint = await question(rl, colors.cyan('Endpoint'), config.endpoint);

      updates = {
        name,
        handle: handle || undefined,
        type,
        description: description || undefined,
        capabilities: capabilities ? capabilities.split(',').map(c => c.trim()).filter(c => c) : undefined,
        skills: skills ? skills.split(',').map(s => s.trim()).filter(s => s) : undefined,
        endpoint: endpoint || undefined,
      };

      rl.close();
    } catch (error) {
      rl.close();
      throw error;
    }
  } else {
    // CLI options mode
    if (options.name) updates.name = options.name;
    if (options.handle) updates.handle = options.handle;
    if (options.type) updates.type = options.type;
    if (options.description) updates.description = options.description;
    if (options.capabilities) {
      updates.capabilities = options.capabilities.split(',').map(c => c.trim()).filter(c => c);
    }
    if (options.skills) {
      updates.skills = options.skills.split(',').map(s => s.trim()).filter(s => s);
    }
    if (options.endpoint) updates.endpoint = options.endpoint;
  }

  const spinner = ora('Updating configuration...').start();

  // Update local config
  const updatedConfig = { ...config, ...updates };
  saveConfig(updatedConfig);

  // If registered, update on server too
  if (config.agentId) {
    spinner.text = 'Syncing with ClawdNet...';
    const response = await updateAgent(config.agentId, updates);

    if (response.success) {
      spinner.succeed('Updated successfully!');
    } else {
      spinner.warn('Local config updated, but failed to sync with network');
      if (!isJsonMode()) {
        logError('Network sync failed', response.error);
        logTip('Your local config is updated. Network will sync on next connection.');
      }
    }
  } else {
    spinner.succeed('Configuration updated!');
  }

  if (isJsonMode()) {
    outputJson({
      success: true,
      config: updatedConfig,
      synced: !!config.agentId,
    });
  } else {
    console.log();
    logField('Name', updatedConfig.name);
    logField('Handle', updatedConfig.handle ? `@${updatedConfig.handle}` : undefined);
    logField('Type', updatedConfig.type);
    logField('Description', updatedConfig.description);
    if (updatedConfig.capabilities?.length) {
      logField('Capabilities', updatedConfig.capabilities.join(', '));
    }
    if (updatedConfig.skills?.length) {
      logField('Skills', updatedConfig.skills.join(', '));
    }
    logField('Endpoint', updatedConfig.endpoint);
    console.log();
  }
}
