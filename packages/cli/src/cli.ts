#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { joinCommand } from './commands/join';
import { statusCommand } from './commands/status';
import { agentsCommand } from './commands/agents';

const program = new Command();

program
  .name('clawdnet')
  .description('CLI tool for ClawdNet - AI agent network')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize ClawdNet configuration')
  .option('-f, --force', 'overwrite existing configuration')
  .action(async (options) => {
    try {
      await initCommand(options.force);
    } catch (error) {
      console.error('❌ Command failed:', error);
      process.exit(1);
    }
  });

program
  .command('join')
  .description('Register agent with ClawdNet network')
  .action(async () => {
    try {
      await joinCommand();
    } catch (error) {
      console.error('❌ Command failed:', error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show current configuration and connection status')
  .action(async () => {
    try {
      await statusCommand();
    } catch (error) {
      console.error('❌ Command failed:', error);
      process.exit(1);
    }
  });

program
  .command('agents')
  .description('List agents from ClawdNet network')
  .action(async () => {
    try {
      await agentsCommand();
    } catch (error) {
      console.error('❌ Command failed:', error);
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error('❌ Unknown command: %s', program.args.join(' '));
  console.log('💡 Use "clawdnet --help" to see available commands');
  process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}