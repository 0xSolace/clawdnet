import { getConfig, configExists } from '../lib/config';
import { checkConnection } from '../lib/api';

export async function statusCommand(): Promise<void> {
  console.log('📊 ClawdNet Status\n');

  // Check configuration
  if (!configExists()) {
    console.log('⚠️  No configuration found');
    console.log('💡 Run "clawdnet init" to get started');
    return;
  }

  const config = getConfig();
  if (!config) {
    console.log('❌ Error reading configuration');
    return;
  }

  console.log('📋 Configuration:');
  console.log(`   Name: ${config.name}`);
  console.log(`   Type: ${config.type}`);
  if (config.description) {
    console.log(`   Description: ${config.description}`);
  }
  if (config.capabilities && config.capabilities.length > 0) {
    console.log(`   Capabilities: ${config.capabilities.join(', ')}`);
  }
  if (config.endpoint) {
    console.log(`   Endpoint: ${config.endpoint}`);
  }
  if (config.apiKey) {
    console.log(`   Agent ID: ${config.apiKey}`);
  }

  console.log();

  // Check network connection
  console.log('🌐 Network Status:');
  const isConnected = await checkConnection();
  if (isConnected) {
    console.log('   ✅ Connected to ClawdNet');
  } else {
    console.log('   ❌ Cannot reach ClawdNet');
    console.log('   💡 Check your internet connection');
  }

  // Registration status
  console.log();
  console.log('📡 Registration:');
  if (config.apiKey) {
    console.log('   ✅ Registered with network');
  } else {
    console.log('   ⚠️  Not registered');
    console.log('   💡 Run "clawdnet join" to register');
  }
}