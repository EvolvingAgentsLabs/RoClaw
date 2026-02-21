/**
 * RoClaw Logger — Simple structured console logger
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'info';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

function formatMessage(level: LogLevel, category: string, msg: string, data?: unknown): string {
  const timestamp = new Date().toISOString().slice(11, 23);
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${category}]`;
  if (data !== undefined) {
    return `${prefix} ${msg} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${msg}`;
}

export const logger = {
  setLevel(level: LogLevel): void {
    currentLevel = level;
  },

  debug(category: string, msg: string, data?: unknown): void {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', category, msg, data));
    }
  },

  info(category: string, msg: string, data?: unknown): void {
    if (shouldLog('info')) {
      console.info(formatMessage('info', category, msg, data));
    }
  },

  warn(category: string, msg: string, data?: unknown): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', category, msg, data));
    }
  },

  error(category: string, msg: string, data?: unknown): void {
    if (shouldLog('error')) {
      console.error(formatMessage('error', category, msg, data));
    }
  },
};
