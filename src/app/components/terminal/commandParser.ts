export type CommandResult =
  | { type: 'scan'; url: string }
  | { type: 'history' }
  | { type: 'stats' }
  | { type: 'clear' }
  | { type: 'theme'; themeName: string }
  | { type: 'export' }
  | { type: 'error'; message: string };

const VALID_THEMES = ['neon-noir', 'crimson-dawn', 'arctic-hack'];

export function parseCommand(input: string): CommandResult {
  const trimmed = input.trim();
  if (!trimmed) return { type: 'error', message: 'Empty command' };

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();

  switch (cmd) {
    case 'scan':
      if (!parts[1]) return { type: 'error', message: 'Usage: scan <url>' };
      return { type: 'scan', url: parts[1] };
    case 'history':
      return { type: 'history' };
    case 'stats':
      return { type: 'stats' };
    case 'clear':
      return { type: 'clear' };
    case 'theme':
      if (!parts[1] || !VALID_THEMES.includes(parts[1])) {
        return {
          type: 'error',
          message: `Unknown theme: ${parts[1] ?? ''}. Valid: ${VALID_THEMES.join(', ')}`,
        };
      }
      return { type: 'theme', themeName: parts[1] };
    case 'export':
      return { type: 'export' };
    default:
      return { type: 'error', message: `Command not found: ${cmd}` };
  }
}

export const COMMAND_HELP = [
  'scan <url>     — Analyze a URL',
  'history        — Show last 10 scans',
  'stats          — Show scan statistics',
  'clear          — Clear terminal output',
  'theme <name>   — Change theme (neon-noir | crimson-dawn | arctic-hack)',
  'export         — Download scan history as JSON',
  'help           — Show this help',
];
