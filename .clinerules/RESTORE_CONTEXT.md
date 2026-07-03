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
Apix/
├── .clinerules/                   # Правила для Cline (ОБЯЗАТЕЛЬНО читать перед работой)
│   ├── anti-loop-rules.md        # Защита от зацикливаний
│   ├── context-rules.md          # Правила PowerShell и работы с файлами
│   ├── execution-rules.md        # Лимиты попыток, пути к документации
│   ├── memory-bank.md            # Инструкция по использованию памяти проекта
│   └── architecture-rules.md     # Бизнес-правила (пересчёт цепочки, снапшоты цен)
├── memory-bank/                   # Память проекта (читать для понимания контекста)
│   ├── activeContext.md          # Текущий фокус и статус
│   ├── progress.md               # Что сделано и что осталось
│   ├── systemPatterns.md         # Ключевая архитектура
│   └── techContext.md            # Технологический стек
├── docs/                          # Полная документация
│   ├── 01_ТЗ.md                  # Техническое задание (DDL, API, интерфейсы)
│   └── 02_Архитектура.md         # Архитектура монорепо
├── apps/
│   ├── client/                   # PWA (React 18 + Vite)
│   └── server/                   # API (Fastify + TypeScript)
└── packages/shared/              # Общие Zod-схемы и типы

## 3. ТЕКУЩИЙ СТАТУС ПРОЕКТА (июнь 2026)
✅ Полностью готово:
- Монорепо, все конфигурационные файлы, Docker Compose, Nginx.
- База данных: 18+ таблиц, Drizzle-схемы, миграции.
- Авторизация: JWT (access + refresh), страница Login.
- Техник: MachineList, ServiceForm (с IndexedDB), Drafts, ForgottenMachines.
- Администратор: Dashboard, MachineCard, ServiceLog, Audit.
- Отчёты: Reports (финансовый), Analytics (графики Recharts).
- Справочники (5 шт.): CRUD для Locations, MachineTypes, Toys, Routes, Staff.
- Layout: Sidebar с иконками, Header с breadcrumbs, мобильная адаптация.
- Серверные эндпоинты: preview, sync, machines, services, reports, audit, cache.
- Пересчёт цепочки обслуживаний (chainRecalc.ts).
- Полный русский язык в UI.
- Сжатие фото перед отправкой (browser-image-compression).
- bcrypt для паролей.
- ВСЕ страницы подключены к реальным API (мок-данные удалены).
- TypeScript компиляция: 0 ошибок на сервере и клиенте.

❌ Осталось (Этап 4 — Деплой и бэклог):
- Деплой: финальная настройка Docker Compose, SSL-сертификаты, CI/CD.
- Presigned URLs для MinIO (доступ к фото через подписанные ссылки).
- Восстановление после сбоев (автоматический перезапуск контейнеров).

## 4. ПРАВИЛА РАБОТЫ (соблюдать неукоснительно)
- Терминал: PowerShell (разделитель `;`, перенаправление `*>&1`).
- TypeScript проверка: писать вывод в файл `tsc_output.txt` и читать его.
- Запрещено создавать временные JS-скрипты (`_tmp_write.js`, `fix_file.js`).
- Только `write_to_file` и `replace_in_file`.
- При 3 ошибках подряд — остановиться и запросить помощь.
- Не читать больше 5 файлов за раз.
- После каждой крупной задачи обновлять memory-bank/activeContext.md и memory-bank/progress.md.

## 5. БЫСТРЫЕ КОМАНДЫ
```powershell
# Запуск сервера (в отдельном окне)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\Evgeny\Projects\Apix\apps\server; npx tsx src/index.ts"
# Запуск клиента
cd C:\Users\Evgeny\Projects\Apix\apps\client; npx vite
# Проверка компиляции
cd apps/server; npx tsc --noEmit *>&1 | Out-File -FilePath tsc_output.txt -Encoding UTF8
cd ../client; npx tsc --noEmit *>&1 | Out-File -FilePath tsc_output.txt -Encoding UTF8
# Миграции БД
cd apps/server; npx drizzle-kit push