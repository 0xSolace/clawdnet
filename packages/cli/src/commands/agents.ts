import { getAgents, Agent } from '../lib/api';

function getStatusEmoji(status: Agent['status']): string {
  switch (status) {
    case 'online': return '🟢';
    case 'offline': return '🔴';
    case 'busy': return '🟡';
    default: return '⚪';
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

export async function agentsCommand(): Promise<void> {
  console.log('🤖 ClawdNet Agents\n');

  const response = await getAgents();

  if (!response.success) {
    console.error('❌ Failed to fetch agents:', response.error);
    console.log('💡 Troubleshooting:');
    console.log('   • Check your internet connection');
    console.log('   • Verify ClawdNet API is accessible');
    return;
  }

  const agents = response.data || [];

  if (agents.length === 0) {
    console.log('📭 No agents found in the network');
    return;
  }

  console.log(`Found ${agents.length} agent${agents.length === 1 ? '' : 's'}:\n`);

  // Sort by status (online first) then by name
  const sortedAgents = agents.sort((a, b) => {
    const statusOrder = { online: 0, busy: 1, offline: 2 };
    const statusDiff = (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
    if (statusDiff !== 0) return statusDiff;
    return a.name.localeCompare(b.name);
  });

  for (const agent of sortedAgents) {
    const statusEmoji = getStatusEmoji(agent.status);
    const lastSeen = formatLastSeen(agent.lastSeen);
    
    console.log(`${statusEmoji} ${agent.name} (${agent.type})`);
    console.log(`   ID: ${agent.id}`);
    
    if (agent.description) {
      console.log(`   Description: ${agent.description}`);
    }
    
    if (agent.capabilities && agent.capabilities.length > 0) {
      console.log(`   Capabilities: ${agent.capabilities.join(', ')}`);
    }
    
    console.log(`   Status: ${agent.status} • Last seen: ${lastSeen}`);
    console.log();
  }
}