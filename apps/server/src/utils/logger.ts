import { db } from "../db/index.js";
import { serverErrors } from "../db/schema/errors.js";
import type { ErrorLevel } from "@apix/shared";

interface LogContext {
  path?: string;
  method?: string;
  userId?: number;
  [key: string]: unknown;
}

/**
 * Структурированный логгер ошибок сервера.
 * Пишет одновременно в консоль и в таблицу server_errors (БД).
 */
export const logger = {
  async log(level: ErrorLevel, message: string, error?: Error | unknown, context?: LogContext) {
    const stack = error instanceof Error ? error.stack ?? null : null;
    const msg = error instanceof Error ? error.message : message;

    // Консоль
    const ts = new Date().toISOString();
    const prefix = `[${ts}] [${level.toUpperCase()}]`;
    if (level === "fatal") {
      console.error(`${prefix} ${msg}`, stack ?? "");
    } else if (level === "error") {
      console.error(`${prefix} ${msg}`);
    } else {
      console.warn(`${prefix} ${msg}`);
    }

    // БД (асинхронно, не блокируем основной поток)
    try {
      await db.insert(serverErrors).values({
        level,
        message: msg,
        stack,
        context: context ?? null,
      });
    } catch (dbError) {
      console.error("[LOGGER] Failed to write error to DB:", dbError);
    }
  },

  error(message: string, error?: Error | unknown, context?: LogContext) {
    return this.log("error", message, error, context);
  },

  warn(message: string, error?: Error | unknown, context?: LogContext) {
    return this.log("warn", message, error, context);
  },

  fatal(message: string, error?: Error | unknown, context?: LogContext) {
    return this.log("fatal", message, error, context);
  },
};