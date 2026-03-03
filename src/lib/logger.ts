type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  process.env.NODE_ENV === "production" ? "info" : "debug";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatMessage(
  level: LogLevel,
  module: string,
  message: string,
): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;
}

export function createLogger(module: string) {
  return {
    debug: (message: string, ...args: unknown[]) => {
      if (shouldLog("debug"))
        console.debug(formatMessage("debug", module, message), ...args);
    },
    info: (message: string, ...args: unknown[]) => {
      if (shouldLog("info"))
        console.info(formatMessage("info", module, message), ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      if (shouldLog("warn"))
        console.warn(formatMessage("warn", module, message), ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      if (shouldLog("error"))
        console.error(formatMessage("error", module, message), ...args);
    },
  };
}
