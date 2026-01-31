import * as readline from 'readline';
import { AgentConfig, saveConfig, configExists } from '../lib/config';

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

export async function initCommand(force: boolean = false): Promise<void> {
  if (configExists() && !force) {
    console.log('⚠️  ClawdNet configuration already exists.');
    console.log('Use --force to overwrite or run "clawdnet status" to view current config.');
    return;
  }

  console.log('🚀 Welcome to ClawdNet!');
  console.log("Let's set up your agent...\n");

  const rl = createReadlineInterface();

  try {
    const name = await question(rl, 'Agent name: ');
    const type = await question(rl, 'Agent type (e.g., assistant, worker, bot): ');
    const description = await question(rl, 'Description (optional): ');
    const capabilitiesInput = await question(rl, 'Capabilities (comma-separated, optional): ');
    const endpoint = await question(rl, 'API endpoint (optional): ');

    const capabilities = capabilitiesInput
      ? capabilitiesInput.split(',').map(c => c.trim()).filter(c => c.length > 0)
      : [];

    const config: AgentConfig = {
      name,
      type,
      ...(description && { description }),
      ...(capabilities.length > 0 && { capabilities }),
      ...(endpoint && { endpoint }),
    };

    saveConfig(config);

    console.log('\n✅ Configuration saved!');
    console.log('📝 Config location: ~/.clawdnet/config.json');
    console.log('🌐 Next step: Run "clawdnet join" to register with the network');

  } catch (error) {
    console.error('❌ Error during initialization:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}