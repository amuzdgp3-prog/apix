# ВОССТАНОВЛЕНИЕ КОНТЕКСТА — Проект APIX (Slot Manager)

**Инструкция для нового экземпляра Cline:**
Прочитай этот файл полностью. Он содержит всё необходимое для продолжения работы.
Затем прочитай .clinerules/execution-rules.md и .clinerules/anti-loop-rules.md.
После этого предложи план дальнейших действий.

---

## 1. СУТЬ ПРОЕКТА

PWA для учёта обслуживания игровых аппаратов типа «хватайка».
- 15 техников вводят данные (оффлайн), 2 админа смотрят отчёты (онлайн).
- Монорепо: apps/client (React 18 + Vite + TypeScript), apps/server (Fastify + TypeScript), packages/shared (Zod-схемы).
- БД: PostgreSQL 16 (Drizzle ORM), фото: MinIO (S3), деплой: Docker Compose + Nginx.

## 2. СТРУКТУРА ПРОЕКТА

```
Apix/
├── apps/
│   ├── client/       # PWA (React 18 + Vite + Tailwind CSS + shadcn/ui)
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

## 3. ТЕКУЩИЙ СТАТУС (29.06.2026)

**Все этапы завершены:**
- ✅ Этап 1: shadcn/ui и все страницы-заглушки
- ✅ Этап 2: Справочники (5 CRUD)
- ✅ Этап 3: Полировка (Layout, иконки, русификация)
- ✅ Этап 4: Наполнение серверных эндпоинтов (sync, preview, services, machines, reports, cache, audit, chainRecalc)
- ✅ Этап 5 (начат): Presigned URL проверен, Dockerfile создан, SSL в nginx.conf добавлен

**TypeScript компиляция: 0 ошибок (сервер + клиент)**

### Осталось по Этапу 5:
- Монтирование `./certs` в `docker-compose.yml` для SSL-сертификатов
- Настройка CI/CD
- Проверка `restart: unless-stopped` для всех контейнеров
- Интеграционное тестирование

## 4. ВСЕ СТРАНИЦЫ И ИХ СОСТОЯНИЕ

### Техник (готовы)
| Маршрут | Файл | Статус |
|---|---|---|
| `/machines` | `pages/technician/MachineList.tsx` | ✅ Готов |
| `/machines/:number/service` | `pages/technician/ServiceForm.tsx` | ✅ Готов |
| `/drafts` | `pages/technician/Drafts.tsx` | ✅ Готов |
| `/forgotten` | `pages/technician/ForgottenMachines.tsx` | ✅ Готов |

### Админ (готовы)
| Маршрут | Файл | Статус |
|---|---|---|
| `/admin` | `pages/admin/Dashboard.tsx` | ✅ Готов |
| `/admin/machines/:number` | `pages/admin/MachineCard.tsx` | ✅ Готов |
| `/admin/services` | `pages/admin/ServiceLog.tsx` | ✅ Готов |
| `/admin/reports` | `pages/admin/Reports.tsx` | ✅ Готов |
| `/admin/analytics` | `pages/admin/Analytics.tsx` | ✅ Готов |
| `/admin/audit` | `pages/admin/Audit.tsx` | ✅ Готов |

### Справочники (готовы)
| Маршрут | Страница | Диалог | Статус |
|---|---|---|---|
| `/admin/machine-types` | `directories/MachineTypes.tsx` | `directories/MachineTypeDialog.tsx` | ✅ Готов |
| `/admin/toys` | `directories/Toys.tsx` | `directories/ToyDialog.tsx` | ✅ Готов |
| `/admin/staff` | `directories/Staff.tsx` | `directories/StaffDialog.tsx` | ✅ Готов |
| `/admin/locations` | `directories/Locations.tsx` | `directories/LocationDialog.tsx` | ✅ Готов |
| `/admin/routes` | `directories/Routes.tsx` | `directories/RouteDialog.tsx` | ✅ Готов |

### Общие
| Маршрут | Файл | Статус |
|---|---|---|
| `/login` | `pages/Login.tsx` | ✅ Готов |

### Компоненты инфраструктуры
| Компонент | Файл |
|---|---|
| Layout | `components/Layout.tsx` |
| Sidebar (с иконками) | `components/Sidebar.tsx` |
| Header (breadcrumbs/аватар/выход) | `components/Header.tsx` |
| DeleteConfirmDialog | `components/DeleteConfirmDialog.tsx` |

### UI-компоненты (shadcn/ui)
`button`, `input`, `label`, `card`, `badge`, `textarea`, `table`, `tabs`, `select`, `dialog` — все в `components/ui/`

### Серверные эндпоинты (все готовы)
| Файл | Назначение |
|---|---|
| `routes/auth.ts` | JWT авторизация (access + refresh) |
| `routes/sync.ts` | Синхронизация IndexedDB → PostgreSQL (JSON + FormData) |
| `routes/preview.ts` | Предварительный расчёт ROI/period_days |
| `routes/services.ts` | Список обслуживаний (фильтры, пагинация, детали с toys, удаление) |
| `routes/machines.ts` | Список машин, карточка (досье), забытые машины |
| `routes/reports.ts` | Финансовый отчёт (агрегация по месяцам/городам/маршрутам) |
| `routes/cache.ts` | Массовая загрузка справочников для оффлайн-кэша |
| `routes/audit.ts` | CRUD журнала аудита |
| `routes/directories.ts` | Агрегатор: registerDirectoryRoutes |
| `routes/directories/locations.ts` | CRUD локаций |
| `routes/directories/routes.ts` | CRUD маршрутов |
| `routes/directories/machineTypes.ts` | CRUD типов машин |
| `routes/directories/toys.ts` | CRUD игрушек |
| `routes/directories/staff.ts` | CRUD сотрудников |
| `services/chainRecalc.ts` | Пересчёт цепочки обслуживаний (revenue, ROI, period_days) |
| `plugins/minio.ts` | MinIO (S3) с presigned URL (TTL 3600с) |
| `plugins/auth.ts` | JWT middleware |
| `plugins/multipart.ts` | FormData/multipart middleware |

### БД (Drizzle ORM, PostgreSQL 16)
Таблицы: `users`, `machines`, `machine_placements`, `machine_types`, `locations`, `routes`, `toys`, `services`, `toy_distributions`, `audit`, `staff`, `service_photos`, `qr_stickers`
Схемы в `apps/server/src/db/schema/index.ts`

## 5. ПРАВИЛА РАБОТЫ (СОБЛЮДАТЬ НЕУКОСНИТЕЛЬНО)

- **Терминал:** PowerShell. Разделитель команд `;`, перенаправление `*>&1`.
  - ❌ `cd server && npx tsc`
  - ✅ `cd server; npx tsc`
- **TypeScript проверка:** писать вывод в файл `tsc_output.txt` и читать его:
  ```
  cd apps/server; npx tsc --noEmit *>&1 | Out-File -FilePath tsc_output.txt -Encoding UTF8
  ```
- **Запрещено** создавать временные JS-скрипты (`_tmp_write.js`, `fix_file.js`).
- **Только** `write_to_file` и `replace_in_file` для работы с файлами.
- **Игнорировать:** `node_modules/`, `dist/`, `build/`, `.pnpm-store/`, `*.log`, `*.lock`.
- **При 3 ошибках подряд** — остановиться и запросить помощь.
- **Не читать больше 5 файлов за раз без явного запроса.**
- **Архитектурные правила** (из `.clinerules/architecture-rules.md`):
  - Пересчёт цепочки — ТОЛЬКО на сервере, ТОЛЬКО в границах placement.
  - Цены на момент обслуживания — снапшот, не пересчитывать.
  - Zod-схемы — единственный источник правды, типы выводятся из них.
  - Миграции БД — только через Drizzle Kit.

## 6. ДОКУМЕНТАЦИЯ

- `docs/01_ТЗ.md` — полное ТЗ (DDL, API, интерфейсы)
- `docs/02_Архитектура.md` — архитектура монорепо
- `memory-bank/` — память проекта (читать ВСЕГДА в начале задачи):
  - `projectbrief.md` — краткое описание
  - `productContext.md` — контекст продукта
  - `systemPatterns.md` — архитектурные паттерны
  - `techContext.md` — технологический стек
  - `activeContext.md` — текущий фокус
  - `progress.md` — что сделано

## 7. БЫСТРЫЙ ЗАПУСК

```powershell
# Установка
pnpm install

# Миграции БД
cd apps/server; npx drizzle-kit push

# Сервер (окно 1) — http://localhost:3001
cd apps/server; npx tsx src/index.ts

# Клиент (окно 2) — http://localhost:5173
cd apps/client; npx vite

# Проверка компиляции
cd apps/server; npx tsc --noEmit *>&1 | Out-File -FilePath tsc_output.txt -Encoding UTF8
cd apps/client; npx tsc --noEmit *>&1 | Out-File -FilePath tsc_output.txt -Encoding UTF8

# Docker
docker build -t apix-server -f apps/server/Dockerfile .
```

## 8. ТЕХНОЛОГИЧЕСКИЙ СТЕК

- **Клиент:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Dexie.js (IndexedDB), PWA (vite-plugin-pwa + Workbox)
- **Сервер:** Fastify, TypeScript, Drizzle ORM, PostgreSQL 16, MinIO (S3), JWT (access + refresh), bcrypt, Zod
- **Деплой:** Docker Compose, Nginx, SSL (TLSv1.2/1.3)
- **Монорепо:** pnpm workspaces