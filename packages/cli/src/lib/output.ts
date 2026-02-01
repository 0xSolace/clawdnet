import chalk from 'chalk';

export interface OutputOptions {
  json?: boolean;
  color?: boolean;
}

let globalOptions: OutputOptions = { color: true };

export function setOutputOptions(options: OutputOptions): void {
  globalOptions = { ...globalOptions, ...options };
}

export function getOutputOptions(): OutputOptions {
  return globalOptions;
}

export function isJsonMode(): boolean {
  return globalOptions.json === true;
}

// Color helpers
export const colors = {
  success: (text: string) => globalOptions.color ? chalk.green(text) : text,
  error: (text: string) => globalOptions.color ? chalk.red(text) : text,
  warning: (text: string) => globalOptions.color ? chalk.yellow(text) : text,
  info: (text: string) => globalOptions.color ? chalk.blue(text) : text,
  dim: (text: string) => globalOptions.color ? chalk.dim(text) : text,
  bold: (text: string) => globalOptions.color ? chalk.bold(text) : text,
  cyan: (text: string) => globalOptions.color ? chalk.cyan(text) : text,
  magenta: (text: string) => globalOptions.color ? chalk.magenta(text) : text,
};

// Status indicators
export const icons = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  arrow: '→',
  bullet: '•',
  online: '●',
  offline: '○',
  busy: '◐',
  verified: '✔',
};

// Formatted log helpers
export function logSuccess(message: string): void {
  if (isJsonMode()) return;
  console.log(`${colors.success(icons.success)} ${message}`);
}

export function logError(message: string, details?: string): void {
  if (isJsonMode()) return;
  console.error(`${colors.error(icons.error)} ${colors.error(message)}`);
  if (details) {
    console.error(`  ${colors.dim(details)}`);
  }
}

export function logWarning(message: string): void {
  if (isJsonMode()) return;
  console.log(`${colors.warning(icons.warning)} ${message}`);
}

export function logInfo(message: string): void {
  if (isJsonMode()) return;
  console.log(`${colors.info(icons.info)} ${message}`);
}

export function logTitle(title: string): void {
  if (isJsonMode()) return;
  console.log(`\n${colors.bold(title)}\n`);
}

export function logField(label: string, value: string | undefined, indent: number = 0): void {
  if (isJsonMode()) return;
  const padding = '  '.repeat(indent);
  if (value !== undefined) {
    console.log(`${padding}${colors.dim(label + ':')} ${value}`);
  }
}

export function logStatus(status: 'online' | 'offline' | 'busy'): string {
  switch (status) {
    case 'online':
      return colors.success(`${icons.online} online`);
    case 'offline':
      return colors.dim(`${icons.offline} offline`);
    case 'busy':
      return colors.warning(`${icons.busy} busy`);
    default:
      return status;
  }
}

export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function outputResult(data: unknown, formatter: () => void): void {
  if (isJsonMode()) {
    outputJson(data);
  } else {
    formatter();
  }
}

// Tips/hints
export function logTip(tip: string): void {
  if (isJsonMode()) return;
  console.log(`  ${colors.dim('→')} ${colors.dim(tip)}`);
}

export function logCommand(command: string): void {
  if (isJsonMode()) return;
  console.log(`    ${colors.cyan(command)}`);
}
