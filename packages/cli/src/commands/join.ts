import { getConfig, saveConfig } from '../lib/config';
import { registerAgent } from '../lib/api';

export async function joinCommand(): Promise<void> {
  const config = getConfig();

  if (!config) {
    console.log('❌ No configuration found.');
    console.log('Run "clawdnet init" first to configure your agent.');
    process.exit(1);
  }

  console.log('🌐 Registering agent with ClawdNet...');
  console.log(`📝 Agent: ${config.name} (${config.type})`);

  const response = await registerAgent(config);

  if (response.success) {
    // Save the agent ID to config
    const updatedConfig = { ...config, apiKey: response.data?.id };
    saveConfig(updatedConfig);

    console.log('✅ Successfully registered with ClawdNet!');
    console.log(`🆔 Agent ID: ${response.data?.id}`);
    console.log('🔗 You are now part of the network');
  } else {
    console.error('❌ Registration failed:', response.error);
    console.log('💡 Troubleshooting:');
    console.log('   • Check your internet connection');
    console.log('   • Verify ClawdNet API is accessible');
    console.log('   • Try again in a moment');
    process.exit(1);
  }
}