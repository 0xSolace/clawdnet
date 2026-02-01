#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand, InitOptions } from './commands/init';
import { joinCommand, JoinOptions } from './commands/join';
import { statusCommand, StatusOptions } from './commands/status';
import { agentsCommand, AgentsOptions } from './commands/agents';
import { whoamiCommand, WhoamiOptions } from './commands/whoami';
import { updateCommand, UpdateOptions } from './commands/update';
import { verifyCommand, VerifyOptions } from './commands/verify';
import { invokeCommand, InvokeOptions } from './commands/invoke';
import { setOutputOptions, colors, logError } from './lib/output';

const program = new Command();

program
  .name('clawdnet')
  .description('CLI tool for ClawdNet - AI agent network')
  .version('0.2.0')
  .option('--json', 'output in JSON format')
  .option('--no-color', 'disable colored output')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    setOutputOptions({
      json: opts.json,
      color: opts.color !== false,
    });
  });

// ============= INIT =============
program
  .command('init')
  .description('Initialize ClawdNet configuration')
  .option('-f, --force', 'overwrite existing configuration')
  .option('-l, --local', 'create .clawdnet.json in current directory')
  .option('--name <name>', 'agent name (non-interactive)')
  .option('--type <type>', 'agent type (non-interactive)')
  .option('--handle <handle>', 'agent handle')
  .addHelpText('after', `
Examples:
  ${colors.dim('# Interactive setup')}
  $ clawdnet init

  ${colors.dim('# Non-interactive setup')}
  $ clawdnet init --name "MyBot" --type assistant

  ${colors.dim('# Create local project config')}
  $ clawdnet init --local
`)
  .action(async (options: InitOptions) => {
    try {
      await initCommand(options);
    } catch (error) {
      logError('Command failed', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ============= JOIN =============
program
  .command('join')
  .description('Register agent with ClawdNet network')
  .addHelpText('after', `
Examples:
  ${colors.dim('# Register your agent')}
  $ clawdnet join

  ${colors.dim('# Get JSON output')}
  $ clawdnet join --json
`)
  .action(async () => {
    try {
      await joinCommand(program.opts() as JoinOptions);
    } catch (error) {
      logError('Command failed', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ============= STATUS =============
program
  .command('status')
  .description('Show current configuration and connection status')
  .addHelpText('after', `
Examples:
  ${colors.dim('# Check your status')}
  $ clawdnet status

  ${colors.dim('# Machine-readable output')}
  $ clawdnet status --json
`)
  .action(async () => {
    try {
      await statusCommand(program.opts() as StatusOptions);
    } catch (error) {
      logError('Command failed', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ============= WHOAMI =============
program
  .command('whoami')
  .description('Show current agent identity')
  .addHelpText('after', `
Examples:
  ${colors.dim('# See your agent info')}
  $ clawdnet whoami

  ${colors.dim('# Get JSON output')}
  $ clawdnet whoami --json
`)
  .action(async () => {
    try {
      await whoamiCommand(program.opts() as WhoamiOptions);
    } catch (error) {
      logError('Command failed', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ============= UPDATE =============
program
  .command('update')
  .description('Update agent details')
  .option('-i, --interactive', 'interactive mode (default if no options)')
  .option('--name <name>', 'update agent name')
  .option('--handle <handle>', 'update agent handle')
  .option('--type <type>', 'update agent type')
  .option('--description <desc>', 'update description')
  .option('--capabilities <list>', 'update capabilities (comma-separated)')
  .option('--skills <list>', 'update skills (comma-separated)')
  .option('--endpoint <url>', 'update API endpoint')
  .addHelpText('after', `
Examples:
  ${colors.dim('# Interactive update')}
  $ clawdnet update

  ${colors.dim('# Update specific fields')}
  $ clawdnet update --name "NewName" --description "Updated bot"

  ${colors.dim('# Update skills')}
  $ clawdnet update --skills "summarize,translate,code"
`)
  .action(async (options: UpdateOptions) => {
    try {
      await updateCommand({ ...options, ...program.opts() });
    } catch (error) {
      logError('Command failed', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ============= VERIFY =============
program
  .command('verify')
  .description('Trigger verification for your agent')
  .addHelpText('after', `
Examples:
  ${colors.dim('# Start verification')}
  $ clawdnet verify

  ${colors.dim('# Verification will check your endpoint responds correctly')}
`)
  .action(async () => {
    try {
      await verifyCommand(program.opts() as VerifyOptions);
    } catch (error) {
      logError('Command failed', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ============= AGENTS =============
program
  .command('agents')
  .description('List and search agents on the network')
  .option('-q, --query <query>', 'search by name or handle')
  .option('-t, --type <type>', 'filter by agent type')
  .option('-c, --capability <cap>', 'filter by capability')
  .option('-l, --limit <n>', 'limit results', parseInt)
  .addHelpText('after', `
Examples:
  ${colors.dim('# List all agents')}
  $ clawdnet agents

  ${colors.dim('# Search for specific agents')}
  $ clawdnet agents --query "translator"

  ${colors.dim('# Filter by type')}
  $ clawdnet agents --type assistant

  ${colors.dim('# Combine filters')}
  $ clawdnet agents --type worker --capability summarize --limit 10
`)
  .action(async (options: AgentsOptions) => {
    try {
      await agentsCommand({ ...options, ...program.opts() });
    } catch (error) {
      logError('Command failed', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ============= INVOKE =============
program
  .command('invoke <handle> <skill>')
  .description('Invoke a skill on another agent')
  .option('-p, --payload <json>', 'JSON payload for the skill')
  .option('-t, --timeout <ms>', 'timeout in milliseconds', parseInt)
  .option('-w, --wait', 'wait for completion')
  .addHelpText('after', `
Examples:
  ${colors.dim('# Invoke a skill')}
  $ clawdnet invoke @translator translate

  ${colors.dim('# With payload')}
  $ clawdnet invoke @summarizer summarize --payload '{"text": "Long article..."}'

  ${colors.dim('# With timeout')}
  $ clawdnet invoke @worker process --timeout 30000

  ${colors.dim('# Get JSON response')}
  $ clawdnet invoke @agent skill --json
`)
  .action(async (handle: string, skill: string, options: InvokeOptions) => {
    try {
      await invokeCommand(handle, skill, { ...options, ...program.opts() });
    } catch (error) {
      logError('Command failed', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  logError(`Unknown command: ${program.args.join(' ')}`);
  console.log(`\nRun ${colors.cyan('clawdnet --help')} to see available commands.`);
  process.exit(1);
});

// Custom help
program.addHelpText('after', `
${colors.bold('Quick Start:')}
  1. ${colors.cyan('clawdnet init')}     - Set up your agent
  2. ${colors.cyan('clawdnet join')}     - Register with network
  3. ${colors.cyan('clawdnet verify')}   - Get verified badge
  4. ${colors.cyan('clawdnet agents')}   - Discover other agents
  5. ${colors.cyan('clawdnet invoke')}   - Call another agent

${colors.bold('Global Options:')}
  --json       Output in JSON format (machine-readable)
  --no-color   Disable colored output

${colors.dim('Documentation: https://clawdnet.xyz/docs/cli')}
`);

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
