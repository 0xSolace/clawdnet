import ora from 'ora';
import { getConfig, configExists, isLocalConfig, getConfigPath } from '../lib/config';
import { checkConnection, getAgent } from '../lib/api';
import { colors, logSuccess, logError, logWarning, logTip, logCommand, outputJson, isJsonMode, logTitle, logField, logStatus, icons } from '../lib/output';

export interface StatusOptions {
  json?: boolean;
}

export async function statusCommand(options: StatusOptions = {}): Promise<void> {
  // Check configuration
  if (!configExists()) {
    if (isJsonMode()) {
      outputJson({ success: false, error: 'No configuration found' });
    } else {
      logWarning('No configuration found');
      logTip('Get started with:');
      logCommand('clawdnet init');
    }
    return;
  }

  const config = getConfig();
  if (!config) {
    if (isJsonMode()) {
      outputJson({ success: false, error: 'Error reading configuration' });
    } else {
      logError('Error reading configuration');
    }
    return;
  }

  const spinner = ora('Checking status...').start();

  // Check network connection
  const isConnected = await checkConnection();

  // Fetch live agent data if registered
  let liveAgent = null;
  if (config.agentId && isConnected) {
    const response = await getAgent(config.agentId);
    if (response.success) {
      liveAgent = response.data;
    }
  }

  spinner.stop();

  if (isJsonMode()) {
    outputJson({
      success: true,
      config: {
        name: config.name,
        handle: config.handle,
        type: config.type,
        description: config.description,
        capabilities: config.capabilities,
        skills: config.skills,
        endpoint: config.endpoint,
        agentId: config.agentId,
        verified: liveAgent?.verified || config.verified,
      },
      configPath: getConfigPath(),
      isLocal: isLocalConfig(),
      network: {
        connected: isConnected,
        registered: !!config.agentId,
        status: liveAgent?.status,
        lastSeen: liveAgent?.lastSeen,
      },
    });
    return;
  }

  logTitle('📊 ClawdNet Status');

  // Configuration section
  console.log(colors.bold('Configuration'));
  console.log(`  ${colors.dim('Path:')} ${getConfigPath()} ${isLocalConfig() ? colors.dim('(local)') : ''}`);
  console.log();

  console.log(colors.bold('Agent'));
  logField('Name', config.name, 1);
  logField('Handle', config.handle ? `@${config.handle}` : undefined, 1);
  logField('Type', config.type, 1);
  logField('Description', config.description, 1);
  
  if (config.capabilities && config.capabilities.length > 0) {
    logField('Capabilities', config.capabilities.join(', '), 1);
  }
  
  if (config.skills && config.skills.length > 0) {
    logField('Skills', config.skills.join(', '), 1);
  }
  
  logField('Endpoint', config.endpoint, 1);
  
  if (config.agentId) {
    logField('Agent ID', config.agentId, 1);
  }

  console.log();

  // Network section
  console.log(colors.bold('Network'));
  
  if (isConnected) {
    console.log(`  ${colors.success(icons.success)} Connected to ClawdNet`);
  } else {
    console.log(`  ${colors.error(icons.error)} Cannot reach ClawdNet`);
    logTip('Check your internet connection');
  }

  console.log();

  // Registration section
  console.log(colors.bold('Registration'));
  
  if (config.agentId) {
    console.log(`  ${colors.success(icons.success)} Registered with network`);
    
    if (liveAgent) {
      console.log(`  ${logStatus(liveAgent.status)}`);
      
      if (liveAgent.verified) {
        console.log(`  ${colors.success(icons.verified)} ${colors.success('Verified')}`);
      } else {
        console.log(`  ${colors.dim(icons.offline)} Not verified`);
        logTip('Get verified: clawdnet verify');
      }
      
      if (liveAgent.lastSeen) {
        logField('Last seen', formatLastSeen(liveAgent.lastSeen), 1);
      }
    }
  } else {
    console.log(`  ${colors.warning(icons.warning)} Not registered`);
    logTip('Register with: clawdnet join');
  }

  console.log();
}

function formatLastSeen(lastSeen: string): string {
  try {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch (error) {
    return 'unknown';
  }
}
