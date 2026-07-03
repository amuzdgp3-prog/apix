# СТАРТОВЫЙ ФАЙЛ СЕССИИ — читать ПЕРВЫМ в каждом новом чате

## 1. ТЫ РАБОТАЕШЬ В POWERSHELL

Запомни раз и навсегда: ТЫ В WINDOWS POWERSHELL, а не в Linux.

Запрещено: &&, curl, export, 2>&1, sleep, kill, grep
Используй: ; (последовательность), Invoke-WebRequest, $env:, *>&1, Start-Sleep, taskkill, Select-String

Проверка порта ТОЛЬКО через netstat: `netstat -ano | findstr ":5173"`

## 2. БАЗОВАЯ ИНФРАСТРУКТУРА (порты и пути)

- Проект: C:\Users\Evgeny\Projects\Apix
- Сервер API (локально): http://localhost:3000
- Клиент Vite (локально): http://localhost:5173
- База данных: PostgreSQL на localhost:5432, БД "apix", пользователь "apix", пароль "apix_password"
- MinIO: http://localhost:9000, пользователь "minioadmin", пароль "minioadmin"

## 3. VDS СЕРВЕР (продакшен)

- Тарифный план: Turbo 4
- Дата открытия: 2026-07-03
- Доменное имя: vm240994.vds.miran.ru
- IP-адрес: 91.142.90.200
- Пользователь: root
- Пароль: 3FMTutF1Ad
- Доступ по SSH: ssh root@91.142.90.200

Команда для запуска сервера (в отдельном окне):
`Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\Evgeny\Projects\Apix\apps\server; npx tsx src/index.ts"`

Команда для запуска клиента (в отдельном окне):
`Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\Evgeny\Projects\Apix\apps\client; npx vite"`

## 4. ТЕСТОВЫЕ УЧЁТНЫЕ ДАННЫЕ (ЗАПОМНИ)

- Админ: admin@test.com / admin123
- Техник 1: ivan@test.com / admin123
- Техник 2: petr@test.com / admin123
- Пароль БД: apix_password

## 5. ТЕКУЩИЙ СТАТУС ПРОЕКТА

Проект: Apix (Slot Manager) — PWA для учёта обслуживания игровых аппаратов.
Стек: React 18 + Vite (клиент), Fastify + TypeScript (сервер), PostgreSQL 16 (Drizzle ORM), MinIO (фото), Docker Compose + Nginx (деплой).
Все этапы разработки (1-5) завершены. Осталось только финальное тестирование в браузере.

## 6. ПРАВИЛА ПОВЕДЕНИЯ

- При запуске новой сессии первым делом прочитай ЭТОТ файл (SESSION_START.md).
- Затем прочитай: .clinerules/powershell-mandatory.md, memory-bank/activeContext.md, memory-bank/progress.md
- Не используй curl. Используй Invoke-WebRequest с TimeoutSec 5.
- Не используй Invoke-WebRequest для проверки Vite (порт 5173). Используй netstat.
- При зависании команды — сразу сообщи пользователю, не жди.
- Не создавай временные JS-скрипты.

## 7. АКТУАЛЬНАЯ ЗАДАЧА

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
