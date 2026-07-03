# Технологический стек — Apix (Slot Manager)

## Фронтенд (apps/client)
- React 18, TypeScript, Vite
- Tailwind CSS, shadcn/ui
- React Router v6, TanStack Query, React Hook Form + Zod
- Dexie.js (IndexedDB) — оффлайн-хранение черновиков и кэша
- Recharts — графики
- html5-qrcode — сканирование QR
- browser-image-compression — сжатие фото
- vite-plugin-pwa (Workbox) — Service Worker

## Бэкенд (apps/server)
- Node.js 20 LTS, Fastify, TypeScript
- PostgreSQL 16, Drizzle ORM + drizzle-kit (миграции)
- @fastify/multipart — загрузка файлов
- MinIO (S3-совместимый, self-hosted) — хранилище фото
- JWT (access 1ч + refresh 7д, httpOnly cookie)
- bcrypt (salt 10), pino (логирование), node-cron, ExcelJS

## Инфраструктура
- Docker + docker-compose
- Сервисы: postgres, minio, server, nginx
- Nginx: SSL termination, проксирование к API и MinIO
- Монорепо: pnpm workspaces

## База данных — ключевые таблицы
- machine_types, toys, toy_price_history, machine_type_toys
- staff, refresh_tokens
- locations (дерево), routes, route_locations
- machines, machine_toys, machine_routes, machine_technicians
- machine_placements (сессии)
- service, toy_distribution
- audit_log, audit_log_archive