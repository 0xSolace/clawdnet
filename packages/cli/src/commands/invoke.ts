import ora from 'ora';
import { getConfig, configExists } from '../lib/config';
import { invokeAgent } from '../lib/api';
import { colors, logSuccess, logError, logWarning, logTip, logCommand, outputJson, isJsonMode, logTitle, logField, icons } from '../lib/output';

export interface InvokeOptions {
  json?: boolean;
  payload?: string;
  timeout?: number;
  wait?: boolean;
}

export async function invokeCommand(handle: string, skill: string, options: InvokeOptions = {}): Promise<void> {
  if (!handle) {
    if (isJsonMode()) {
      outputJson({ success: false, error: 'Handle is required' });
    } else {
      logError('Handle is required');
      logTip('Usage: clawdnet invoke <handle> <skill>');
      logCommand('clawdnet invoke @myagent summarize');
    }
    process.exit(1);
  }

  if (!skill) {
    if (isJsonMode()) {
      outputJson({ success: false, error: 'Skill is required' });
    } else {
      logError('Skill is required');
      logTip('Usage: clawdnet invoke <handle> <skill>');
      logCommand('clawdnet invoke @myagent summarize --payload \'{"text": "..."}\'');
    }
    process.exit(1);
  }

  // Normalize handle
  const targetHandle = handle.startsWith('@') ? handle.slice(1) : handle;

  // Parse payload if provided
  let payload: Record<string, unknown> | undefined;
  if (options.payload) {
    try {
      payload = JSON.parse(options.payload);
    } catch (error) {
      if (isJsonMode()) {
        outputJson({ success: false, error: 'Invalid JSON payload' });
      } else {
        logError('Invalid JSON payload', 'Make sure your --payload is valid JSON');
      }
      process.exit(1);
    }
  }

  if (!isJsonMode()) {
    logTitle('🚀 Invoking Agent');
    console.log(`  ${colors.dim('Target:')} ${colors.cyan(`@${targetHandle}`)}`);
    console.log(`  ${colors.dim('Skill:')} ${skill}`);
    if (payload) {
      console.log(`  ${colors.dim('Payload:')} ${JSON.stringify(payload).slice(0, 50)}...`);
    }
    console.log();
  }

  const spinner = ora('Sending request...').start();

  const response = await invokeAgent({
    targetHandle,
    skill,
    payload,
    timeout: options.timeout,
  });

  if (response.success && response.data) {
    const result = response.data;

    switch (result.status) {
      case 'completed':
        spinner.succeed('Request completed!');
        break;
      case 'queued':
        spinner.succeed('Request queued');
        break;
      case 'processing':
        spinner.succeed('Request is processing');
        break;
      case 'failed':
        spinner.fail('Request failed');
        break;
      default:
        spinner.info(`Status: ${result.status}`);
    }

    if (isJsonMode()) {
      outputJson({
        success: true,
        requestId: result.requestId,
        status: result.status,
        result: result.result,
        error: result.error,
      });
    } else {
      console.log();
      logField('Request ID', result.requestId);
      logField('Status', result.status);

      if (result.result !== undefined) {
        console.log();
        console.log(colors.bold('Result:'));
        if (typeof result.result === 'object') {
          console.log(JSON.stringify(result.result, null, 2));
        } else {
          console.log(`  ${result.result}`);
        }
      }

      if (result.error) {
        console.log();
        logError('Error from agent', result.error);
      }

      if (result.status === 'queued' || result.status === 'processing') {
        console.log();
        logTip('Request is being processed. Check status with:');
        logCommand(`clawdnet invoke-status ${result.requestId}`);
      }
    }
  } else {
    spinner.fail('Failed to invoke agent');

    if (isJsonMode()) {
      outputJson({ success: false, error: response.error });
    } else {
      console.log();
      logError('Could not invoke agent', response.error);
      console.log();
      logTip('Troubleshooting:');
      console.log(`  ${colors.dim('•')} Verify the handle exists: clawdnet agents --query ${targetHandle}`);
      console.log(`  ${colors.dim('•')} Check the agent supports the skill`);
      console.log(`  ${colors.dim('•')} Ensure the agent is online`);
    }
    process.exit(1);
  }
}
