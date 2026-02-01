import ora from 'ora';
import { getConfig, configExists, getConfigPath, isLocalConfig } from '../lib/config';
import { getAgent } from '../lib/api';
import { colors, logError, logWarning, logTip, logCommand, outputJson, isJsonMode, logTitle, logField, logStatus, icons } from '../lib/output';

export interface WhoamiOptions {
  json?: boolean;
}

export async function whoamiCommand(options: WhoamiOptions = {}): Promise<void> {
  if (!configExists()) {
    if (isJsonMode()) {
      outputJson({ success: false, error: 'No configuration found' });
    } else {
      logWarning('No configuration found');
      logTip('Initialize your agent:');
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

  let liveData = null;
  
  if (config.agentId) {
    const spinner = ora('Fetching agent info...').start();
    const response = await getAgent(config.agentId);
    spinner.stop();
    
    if (response.success) {
      liveData = response.data;
    }
  }

  if (isJsonMode()) {
    outputJson({
      success: true,
      agent: {
        name: config.name,
        handle: config.handle || liveData?.handle,
        type: config.type,
        description: config.description,
        capabilities: config.capabilities,
        skills: config.skills,
        endpoint: config.endpoint,
        agentId: config.agentId,
        verified: liveData?.verified || false,
        status: liveData?.status,
        createdAt: config.createdAt,
        lastSeen: liveData?.lastSeen,
      },
      registered: !!config.agentId,
      configPath: getConfigPath(),
    });
    return;
  }

  logTitle('🤖 Agent Identity');

  const handle = config.handle || liveData?.handle;
  const verified = liveData?.verified;

  // Big display name
  console.log(`  ${colors.bold(config.name)}${verified ? colors.success(' ✔') : ''}`);
  if (handle) {
    console.log(`  ${colors.cyan(`@${handle}`)}`);
  }
  console.log();

  // Details
  logField('Type', config.type, 1);
  logField('Description', config.description, 1);
  
  if (config.agentId) {
    logField('Agent ID', config.agentId, 1);
  }

  if (config.capabilities && config.capabilities.length > 0) {
    logField('Capabilities', config.capabilities.join(', '), 1);
  }

  if (config.skills && config.skills.length > 0) {
    logField('Skills', config.skills.join(', '), 1);
  }

  logField('Endpoint', config.endpoint, 1);
  logField('Created', config.createdAt ? new Date(config.createdAt).toLocaleDateString() : undefined, 1);

  console.log();

  // Status
  if (liveData) {
    console.log(`  ${logStatus(liveData.status)}`);
    if (verified) {
      console.log(`  ${colors.success(icons.verified)} ${colors.success('Verified Agent')}`);
    }
  } else if (!config.agentId) {
    console.log(`  ${colors.warning(icons.warning)} Not registered`);
    logTip('Register with: clawdnet join');
  }

  console.log();
}
