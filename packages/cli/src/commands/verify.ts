import ora from 'ora';
import { getConfig, saveConfig, configExists } from '../lib/config';
import { verifyAgent } from '../lib/api';
import { colors, logSuccess, logError, logWarning, logTip, logCommand, outputJson, isJsonMode, logTitle, logField, icons } from '../lib/output';

export interface VerifyOptions {
  json?: boolean;
}

export async function verifyCommand(options: VerifyOptions = {}): Promise<void> {
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

  if (!config.agentId) {
    if (isJsonMode()) {
      outputJson({ success: false, error: 'Agent not registered. Run "clawdnet join" first.' });
    } else {
      logWarning('Agent not registered with the network.');
      logTip('Register first:');
      logCommand('clawdnet join');
    }
    process.exit(1);
  }

  if (config.verified) {
    if (isJsonMode()) {
      outputJson({ success: true, verified: true, message: 'Agent is already verified' });
    } else {
      logSuccess('Agent is already verified!');
      console.log(`  ${colors.success(icons.verified)} ${colors.bold(config.name)}`);
    }
    return;
  }

  if (!isJsonMode()) {
    logTitle('🔐 Agent Verification');
    console.log('Starting verification process...\n');
  }

  const spinner = ora('Initiating verification...').start();

  const response = await verifyAgent(config.agentId);

  if (response.success && response.data) {
    if (response.data.verified) {
      spinner.succeed('Verification successful!');

      // Update local config
      const updatedConfig = { ...config, verified: true };
      saveConfig(updatedConfig);

      if (isJsonMode()) {
        outputJson({
          success: true,
          verified: true,
          method: response.data.method,
          timestamp: response.data.timestamp,
        });
      } else {
        console.log();
        console.log(`  ${colors.success(icons.verified)} ${colors.bold(config.name)} is now ${colors.success('verified')}!`);
        console.log();
        logField('Method', response.data.method);
        logField('Verified at', new Date(response.data.timestamp).toLocaleString());
        if (response.data.details) {
          logField('Details', response.data.details);
        }
        console.log();
        logSuccess('Your agent now has a verified badge on ClawdNet!');
      }
    } else {
      spinner.warn('Verification pending');

      if (isJsonMode()) {
        outputJson({
          success: true,
          verified: false,
          message: 'Verification initiated but not yet complete',
          details: response.data.details,
        });
      } else {
        console.log();
        logWarning('Verification initiated but not yet complete.');
        if (response.data.details) {
          console.log(`  ${colors.dim(response.data.details)}`);
        }
        logTip('Check back later with: clawdnet status');
      }
    }
  } else {
    spinner.fail('Verification failed');

    if (isJsonMode()) {
      outputJson({ success: false, error: response.error });
    } else {
      console.log();
      logError('Could not complete verification', response.error);
      console.log();
      logTip('Troubleshooting:');
      console.log(`  ${colors.dim('•')} Ensure your agent endpoint is accessible`);
      console.log(`  ${colors.dim('•')} Check that your agent responds to verification requests`);
      console.log(`  ${colors.dim('•')} Try again in a moment`);
    }
    process.exit(1);
  }
}
