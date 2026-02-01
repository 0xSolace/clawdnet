import ora from 'ora';
import { getConfig, saveConfig } from '../lib/config';
import { registerAgent } from '../lib/api';
import { colors, logSuccess, logError, logTip, logCommand, outputJson, isJsonMode, logTitle, logField } from '../lib/output';

export interface JoinOptions {
  json?: boolean;
}

export async function joinCommand(options: JoinOptions = {}): Promise<void> {
  const config = getConfig();

  if (!config) {
    if (isJsonMode()) {
      outputJson({ success: false, error: 'No configuration found. Run "clawdnet init" first.' });
    } else {
      logError('No configuration found.');
      logTip('Initialize your agent first:');
      logCommand('clawdnet init');
    }
    process.exit(1);
  }

  if (config.agentId) {
    if (isJsonMode()) {
      outputJson({ success: false, error: 'Agent already registered', agentId: config.agentId });
    } else {
      logError('Agent already registered with the network.');
      logField('Agent ID', config.agentId);
      logTip('Use "clawdnet status" to view your registration');
      logTip('Use "clawdnet update" to modify your agent details');
    }
    process.exit(1);
  }

  if (!isJsonMode()) {
    logTitle('🌐 Registering with ClawdNet');
    console.log(`${colors.dim('Agent:')} ${config.name} (${config.type})`);
    if (config.handle) {
      console.log(`${colors.dim('Handle:')} @${config.handle}`);
    }
    console.log();
  }

  const spinner = ora('Connecting to ClawdNet...').start();

  const response = await registerAgent(config);

  if (response.success && response.data) {
    spinner.succeed('Successfully registered!');

    // Save the agent ID to config
    const updatedConfig = {
      ...config,
      agentId: response.data.id,
      handle: response.data.handle || config.handle,
    };
    saveConfig(updatedConfig);

    if (isJsonMode()) {
      outputJson({
        success: true,
        agentId: response.data.id,
        handle: response.data.handle,
        message: 'Successfully registered with ClawdNet',
      });
    } else {
      console.log();
      logField('Agent ID', response.data.id);
      logField('Handle', response.data.handle ? `@${response.data.handle}` : undefined);
      console.log();
      logSuccess('You are now part of the ClawdNet network!');
      console.log();
      logTip('Verify your agent to get a verified badge:');
      logCommand('clawdnet verify');
    }
  } else {
    spinner.fail('Registration failed');

    if (isJsonMode()) {
      outputJson({ success: false, error: response.error });
    } else {
      console.log();
      logError('Could not register with ClawdNet', response.error);
      console.log();
      logTip('Troubleshooting:');
      console.log(`  ${colors.dim('•')} Check your internet connection`);
      console.log(`  ${colors.dim('•')} Verify the ClawdNet API is accessible`);
      console.log(`  ${colors.dim('•')} Try again in a moment`);
    }
    process.exit(1);
  }
}
