# Apix — Slot Manager (PWA)

Приложение для учёта обслуживания игровых аппаратов типа «хватайка».
Монорепо: сервер (Fastify + TypeScript), клиент (React 18 + Vite + PWA), общие схемы (Zod).

## Быстрый старт

```powershell
# 1. Установка зависимостей
pnpm install

# 2. Создать .env файл сервера (на основе .env.example)
copy .env.example apps\server\.env
# Отредактируй apps\server\.env — укажи DATABASE_URL, MINIO_*, JWT_SECRET

# 3. Прогнать миграции БД
cd apps\server; npx drizzle-kit push

# 4. Запуск сервера (окно 1)
cd apps\server; npx tsx src\index.ts
# Сервер стартует на http://localhost:3001

# 5. Запуск клиента (окно 2)
cd apps\client; npx vite
# Клиент стартует на http://localhost:5173

# 6. Открыть в браузере
# http://localhost:5173
```

## Команды

| Действие | Команда |
|---|---|
| Установка зависимостей | `pnpm install` |
| Запуск сервера | `cd apps/server; npx tsx src/index.ts` |
| Запуск клиента | `cd apps/client; npx vite` |
| Прогнать миграции БД | `cd apps/server; npx drizzle-kit push` |
| Проверка TypeScript (сервер) | `cd apps/server; npx tsc --noEmit` |
| Проверка TypeScript (клиент) | `cd apps/client; npx tsc --noEmit` |
| Docker-сборка сервера | `docker build -t apix-server -f apps/server/Dockerfile .` |

## Структура проекта

```
Apix/
├── apps/
│   ├── client/       # PWA (React 18 + Vite + Tailwind CSS)
│   └── server/       # API (Fastify + TypeScript + Drizzle ORM)
├── packages/
│   └── shared/       # Общие Zod-схемы и TypeScript-типы
├── docs/             # ТЗ и Архитектура
├── memory-bank/      # Память проекта
├── .clinerules/      # Правила для Cline
├── docker-compose.yml
├── nginx.conf
└── README.md
```

## Технологический стек

- **Клиент:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Dexie.js (IndexedDB), PWA
- **Сервер:** Fastify, TypeScript, Drizzle ORM, PostgreSQL 16, MinIO (S3), JWT
- **Деплой:** Docker Compose, Nginx, SSL

## Документация

- `docs/01_ТЗ.md` — полное техническое задание
- `docs/02_Архитектура.md` — архитектура монорепо
- `memory-bank/` — текущий статус и контекст проекта

## Лицензия

Private