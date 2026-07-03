import { FastifyInstance } from "fastify";

/**
 * Fastify plugin for multipart form data (photo uploads).
 * Реализует раздел ТЗ 13.5 — Загрузка фото.
 *
 * Регистрирует @fastify/multipart с ограничениями размера (10 MB).
 * Используется в routes/sync.ts для приёма фото и данных обслуживания.
 */
export async function multipartPlugin(app: FastifyInstance) {
  // Already registered in index.ts via app.register(multipart, ...)
  // This is a named wrapper for reusability.
  // No additional setup needed — the decorator is available as request.file()
}