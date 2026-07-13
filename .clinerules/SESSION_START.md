# СТАРТОВЫЙ ФАЙЛ СЕССИИ — читать ПЕРВЫМ в каждом новом чате

**Инструкция для нового экземпляра Cline:**
Прочитай этот файл полностью. Он содержит всё необходимое для продолжения работы.
Затем прочитай .clinerules/powershell-mandatory.md, .clinerules/anti-loop-rules.md, memory-bank/activeContext.md и memory-bank/progress.md.
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
│   ├── SESSION_START.md          # Этот файл — входная точка
│   ├── powershell-mandatory.md   # ВСЕ правила PowerShell (замены, шаблоны, предотвращение зависаний)
│   ├── anti-loop-rules.md        # Защита от зацикливаний
│   ├── context-rules.md          # Правила работы с файлами, игнорирование, прототипирование
│   ├── execution-rules.md        # Лимиты попыток, пути к документации
│   ├── architecture-rules.md     # Бизнес-правила (пересчёт цепочки, снапшоты цен)
│   ├── timeout-rules.md          # Таймауты для долгих команд
│   └── memory-bank.md            # Инструкция по использованию памяти проекта
├── memory-bank/                   # Память проекта (читать для понимания контекста)
│   ├── activeContext.md          # Текущий фокус и статус
│   ├── progress.md               # Что сделано и что осталось
│   ├── systemPatterns.md         # Ключевая архитектура
│   ├── techContext.md            # Технологический стек
│   ├── productContext.md         # Контекст продукта
│   └── projectbrief.md           # Краткое описание проекта
├── docs/                          # Полная документация
│   ├── 01_ТЗ.md                  # Техническое задание (DDL, API, интерфейсы)
│   └── 02_Архитектура.md         # Архитектура монорепо
├── apps/
│   ├── client/                   # PWA (React 18 + Vite)
│   └── server/                   # API (Fastify + TypeScript)
└── packages/shared/              # Общие Zod-схемы и типы

## 3. БАЗОВАЯ ИНФРАСТРУКТУРА (порты и пути)

### Локально
- Проект: C:\Users\Evgeny\Projects\Apix
- Сервер API: http://localhost:3000
- Клиент Vite: http://localhost:5173
- База данных: PostgreSQL на localhost:5432, БД "apix", пользователь "apix", пароль "apix_password"
- MinIO: http://localhost:9000, пользователь "minioadmin", пароль "minioadmin"

### VDS СЕРВЕР (продакшен)
- Тарифный план: Turbo 4
- Дата открытия: 2026-07-03
- Доменное имя: vm240994.vds.miran.ru
- IP-адрес: 91.142.90.200
- Пользователь: root
- Пароль: 3FMTutF1Ad
- Доступ по SSH: ssh root@91.142.90.200

## 4. ТЕСТОВЫЕ УЧЁТНЫЕ ДАННЫЕ (ЗАПОМНИ)
- Админ: admin@test.com / admin123
- Техник 1: ivan@test.com / admin123
- Техник 2: petr@test.com / admin123
- Пароль БД: apix_password

## 5. ТЕКУЩИЙ СТАТУС ПРОЕКТА

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

## 6. ПРАВИЛА ПОВЕДЕНИЯ

- При запуске новой сессии первым делом прочитай ЭТОТ файл (SESSION_START.md).
- Затем прочитай: .clinerules/powershell-mandatory.md, memory-bank/activeContext.md, memory-bank/progress.md
- Не используй curl. Используй Invoke-WebRequest с TimeoutSec 5.
- Не используй Invoke-WebRequest для проверки Vite (порт 5173). Используй netstat.
- При зависании команды — сразу сообщи пользователю, не жди.
- Не создавай временные JS-скрипты.
- После каждой крупной задачи обновлять memory-bank/activeContext.md и memory-bank/progress.md.

## 7. БЫСТРЫЕ КОМАНДЫ

```powershell
# Запуск сервера (в отдельном окне)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\Evgeny\Projects\Apix\apps\server; npx tsx src/index.ts"

# Запуск клиента (в отдельном окне)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\Evgeny\Projects\Apix\apps\client; npx vite"

# Проверка компиляции
cd apps/server; npx tsc --noEmit *>&1 | Out-File -FilePath tsc_output.txt -Encoding UTF8
cd ../client; npx tsc --noEmit *>&1 | Out-File -FilePath tsc_output.txt -Encoding UTF8

# Миграции БД
cd apps/server; npx drizzle-kit push
```

## 8. АКТУАЛЬНАЯ ЗАДАЧА

Выполни финальное тестирование проекта:
1. Проверь, что сервер слушает порт 3000 (netstat).
2. Проверь, что клиент слушает порт 5173 (netstat).
3. Открой браузер Playwright на http://localhost:5173.
4. Войди под админом: admin@test.com / admin123.
5. Проверь все страницы и справочники.
6. Выйди, войди под техником: ivan@test.com / admin123.
7. Проведи обслуживание, синхронизируй черновик.
8. Выйди, войди под админом, проверь журнал и дашборд.
9. Напиши финальный отчёт и обнови memory-bank/progress.md.