import * as readline from 'readline';
import ora from 'ora';
import { AgentConfig, saveConfig, configExists, isLocalConfig } from '../lib/config';
import { colors, logSuccess, logWarning, logTip, logCommand, outputJson, isJsonMode, logTitle } from '../lib/output';

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

export interface InitOptions {
  force?: boolean;
  local?: boolean;
  json?: boolean;
  name?: string;
  type?: string;
  handle?: string;
}

export async function initCommand(options: InitOptions): Promise<void> {
  if (isJsonMode() && (!options.name || !options.type)) {
    outputJson({ success: false, error: 'JSON mode requires --name and --type options' });
    process.exit(1);
  }

  if (configExists() && !options.force) {
    if (isJsonMode()) {
      outputJson({ success: false, error: 'Configuration already exists. Use --force to overwrite.' });
    } else {
      logWarning('ClawdNet configuration already exists.');
      logTip('Use --force to overwrite');
      logTip('Run "clawdnet status" to view current config');
    }
    return;
  }

  let config: AgentConfig;

  if (options.name && options.type) {
    // Non-interactive mode
    config = {
      name: options.name,
      type: options.type,
      handle: options.handle,
      createdAt: new Date().toISOString(),
    };
  } else {
    // Interactive mode
    logTitle('🚀 Welcome to ClawdNet!');
    console.log("Let's set up your agent...\n");

    const rl = createReadlineInterface();

    try {
      const name = await question(rl, `${colors.cyan('Agent name')}: `);
      const handle = await question(rl, `${colors.cyan('Handle')} ${colors.dim('(e.g., @myagent)')}: `);
      const type = await question(rl, `${colors.cyan('Agent type')} ${colors.dim('(assistant, worker, bot)')}: `);
      const description = await question(rl, `${colors.cyan('Description')} ${colors.dim('(optional)')}: `);
      const capabilitiesInput = await question(rl, `${colors.cyan('Capabilities')} ${colors.dim('(comma-separated, optional)')}: `);
      const skillsInput = await question(rl, `${colors.cyan('Skills')} ${colors.dim('(comma-separated, optional)')}: `);
      const endpoint = await question(rl, `${colors.cyan('API endpoint')} ${colors.dim('(optional)')}: `);

      const capabilities = capabilitiesInput
        ? capabilitiesInput.split(',').map(c => c.trim()).filter(c => c.length > 0)
        : [];

      const skills = skillsInput
        ? skillsInput.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : [];

      config = {
        name,
        handle: handle.startsWith('@') ? handle.slice(1) : handle || undefined,
        type,
        createdAt: new Date().toISOString(),
        ...(description && { description }),
        ...(capabilities.length > 0 && { capabilities }),
        ...(skills.length > 0 && { skills }),
        ...(endpoint && { endpoint }),
      };

      rl.close();
    } catch (error) {
      rl.close();
      throw error;
    }
  }

  const spinner = ora('Saving configuration...').start();

  try {
    saveConfig(config, options.local);
    spinner.succeed('Configuration saved!');

    if (isJsonMode()) {
      outputJson({ success: true, config, location: options.local ? '.clawdnet.json' : '~/.clawdnet/config.json' });
    } else {
      console.log();
      logSuccess(`Config location: ${options.local ? '.clawdnet.json' : '~/.clawdnet/config.json'}`);
      console.log();
      logTip('Next step: Register with the network');
      logCommand('clawdnet join');
    }
  } catch (error) {
    spinner.fail('Failed to save configuration');
    throw error;
  }
}
