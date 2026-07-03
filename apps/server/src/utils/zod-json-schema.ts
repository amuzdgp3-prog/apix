import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodType } from "zod";

/**
 * Конвертирует Zod-схему в JSON Schema для Fastify.
 * Использует $ref: "never" чтобы inline'ить все ссылки.
 */
export function zSchema(schema: ZodType) {
  return zodToJsonSchema(schema, { $refStrategy: "none" }) as Record<string, unknown>;
}