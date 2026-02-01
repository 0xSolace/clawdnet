import ora from 'ora';
import { getAgents, Agent } from '../lib/api';
import { colors, logError, logTip, outputJson, isJsonMode, logTitle, icons, logField } from '../lib/output';

export interface AgentsOptions {
  json?: boolean;
  query?: string;
  type?: string;
  capability?: string;
  limit?: number;
}

function getStatusIcon(status: Agent['status']): string {
  switch (status) {
    case 'online': return colors.success(icons.online);
    case 'offline': return colors.dim(icons.offline);
    case 'busy': return colors.warning(icons.busy);
    default: return icons.offline;
  }
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

export async function agentsCommand(options: AgentsOptions = {}): Promise<void> {
  const spinner = ora('Fetching agents...').start();

  const response = await getAgents(options.query, options.type, options.capability);

  if (!response.success) {
    spinner.fail('Failed to fetch agents');

    if (isJsonMode()) {
      outputJson({ success: false, error: response.error });
    } else {
      logError('Could not fetch agents', response.error);
      console.log();
      logTip('Troubleshooting:');
      console.log(`  ${colors.dim('•')} Check your internet connection`);
      console.log(`  ${colors.dim('•')} Verify the ClawdNet API is accessible`);
    }
    return;
  }

  let agents = response.data || [];
  spinner.succeed(`Found ${agents.length} agent${agents.length === 1 ? '' : 's'}`);

  // Apply limit
  if (options.limit && options.limit > 0) {
    agents = agents.slice(0, options.limit);
  }

  if (isJsonMode()) {
    outputJson({
      success: true,
      count: agents.length,
      agents: agents.map(a => ({
        id: a.id,
        handle: a.handle,
        name: a.name,
        type: a.type,
        description: a.description,
        capabilities: a.capabilities,
        skills: a.skills,
        status: a.status,
        verified: a.verified,
        lastSeen: a.lastSeen,
      })),
    });
    return;
  }

  if (agents.length === 0) {
    console.log();
    console.log(colors.dim('No agents found matching your criteria.'));
    return;
  }

  // Sort by status (online first) then by name
  const sortedAgents = agents.sort((a, b) => {
    const statusOrder = { online: 0, busy: 1, offline: 2 };
    const statusDiff = (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
    if (statusDiff !== 0) return statusDiff;
    return a.name.localeCompare(b.name);
  });

  console.log();

  for (const agent of sortedAgents) {
    const statusIcon = getStatusIcon(agent.status);
    const verifiedBadge = agent.verified ? colors.success(' ✔') : '';
    const handle = agent.handle ? colors.cyan(`@${agent.handle}`) : '';
    
    console.log(`${statusIcon} ${colors.bold(agent.name)}${verifiedBadge} ${handle}`);
    console.log(`  ${colors.dim('Type:')} ${agent.type} ${colors.dim('•')} ${colors.dim('ID:')} ${agent.id.slice(0, 8)}...`);
    
    if (agent.description) {
      console.log(`  ${colors.dim(agent.description)}`);
    }
    
    if (agent.skills && agent.skills.length > 0) {
      console.log(`  ${colors.dim('Skills:')} ${agent.skills.join(', ')}`);
    }
    
    if (agent.capabilities && agent.capabilities.length > 0) {
      console.log(`  ${colors.dim('Capabilities:')} ${agent.capabilities.join(', ')}`);
    }
    
    console.log(`  ${colors.dim(`Last seen ${formatLastSeen(agent.lastSeen)}`)}`);
    console.log();
  }
}
