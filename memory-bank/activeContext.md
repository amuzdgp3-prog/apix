# Текущий контекст работы — Apix (Slot Manager)

**Дата последнего обновления:** 12.07.2026, 19:27 MSK
## Context Navigation (Graphify)
1. ВСЕГДА сначала читай graphify-out/GRAPH_REPORT.md, чтобы понять структуру проекта.
2. Сырые файлы открывай только если я попрошу прямо, или если в карте недостаточно информации.
3. Для точечных запросов используй graphify-out/graph.json.

## Текущий фокус
Финальное тестирование локального окружения — ЗАВЕРШЕНО.

## Результаты тестирования (12.07.2026)
- [x] Сервер (порт 3000): работает, API-эндпоинты отвечают (200 OK)
- [x] Клиент (порт 5173): Vite dev-server работает
- [x] Авторизация: админ (admin@test.com) и техник (ivan@test.com) входят успешно
- [x] Админ-панель: Dashboard с метриками, справочники, навигация — всё работает
- [x] TypeScript: 0 ошибок компиляции (сервер + клиент)
- [x] Проект в продакшене: https://vm240994.vds.miran.ru

### История
- ✅ **14.07.2026**: Исправлен баг "Выдача игрушек" в ServiceForm.tsx — заменены raw `fetch()` на `api.get()`/`api.post()` с JWT-токеном (раньше 401 молча проглатывался, toyCatalog был пуст)
- ✅ **14.07.2026** (v2): Добавлен fallback на IndexedDB при ошибке `api.get("/toys")` — оффлайн-режим PWA, игрушки загружаются из локальной базы
- ✅ Баннер забытых аппаратов в Layout (useForgottenMachines)
- ✅ Экспорт XLSX через exceljs с форматированием
- ✅ Двухуровневое наследование игрушек
- ✅ TypeScript: 0 ошибок (сервер + клиент)
- ✅ QR-код (эндпоинт + сканирование в ServiceForm + qrPrint.ts)
- ✅ Деплой на VDS (09.07.2026)
- ✅ Обновление деплоя (11.07.2026)

### Осталось (будущие задачи)
1. Настоящий SSL-сертификат (нужен собственный домен для Let's Encrypt)
2. CI/CD автодеплой при git push
3. Мониторинг и алерты

## VDS Сервер (куплен 03.07.2026)
- Тариф: Turbo 4
- Домен: vm240994.vds.miran.ru
- IP: 91.142.90.200
- Доступ: root, SSH-ключ (id_rsa) — без пароля
- Проект в /opt/apix/
куплен домен apixspb.ru

## Статус деплоя
### ✅ Работает
- Docker + Docker Compose установлены
- Все 6 контейнеров поднимаются (postgres, minio, client-builder, server, nginx)
- Сборка server (Dockerfile) и client-builder проходят без ошибок
- Nginx раздаёт статику клиента на порту 80
- SSH-ключ настроен, парольный вход не нужен

### 🔴 Проблема (остановка)
Сервер (apix-server) падает при запуске:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/apps/server/node_modules/@apix/shared/dist/index.js'
```
**Причина:** pnpm workspace создаёт symlink `node_modules/@apix/shared → ../../packages/shared`. При копировании `node_modules` в production stage Dockerfile пакет `packages/shared` копируется только как `src`, но не как `dist`, поэтому symlink ведёт в никуда.

### Текущие задачи (приоритет)
- [x] ✅ Замена аппарата на точке (MachineCard + серверный эндпоинт) — 08.07.2026
- [ ] QR-код: эндпоинт `/api/machines/:number/qr` + интеграция qrPrint.ts + сканирование в ServiceForm
- [x] ✅ Баннер забытых аппаратов: useForgottenMachines в Layout — 08.07.2026
- [x] ✅ Экспорт в Excel: XLSX через exceljs — 08.07.2026
- [x] ✅ Двухуровневое наследование игрушек: тип → базовый набор → индивидуальные правки — 09.07.2026
- [ ] SSL-сертификаты (Let's Encrypt)
- [ ] Финальный деплой (`git push origin main`)

### Файлы для работы
- `apps/server/Dockerfile` — ✅ исправлен (packages/shared копируется целиком)
- `apps/server/src/routes/machines.ts` — добавить эндпоинт замены аппарата + QR
- `apps/client/src/pages/admin/MachineCard.tsx` — добавить замену аппарата
- `apps/client/src/pages/technician/ServiceForm.tsx` — добавить QR-сканирование
- `apps/client/src/components/Header.tsx` — подключить useForgottenMachines
- `apps/server/src/routes/reports.ts` — добавить XLSX экспорт
- `apps/client/src/pages/admin/Analytics.tsx` — добавить кнопки экспорта
- `docker-compose.yml` — ок
- `nginx.conf` — ок
- `.env.production` — ок

### Команды
```powershell
# Пересборка и деплой сервера на VDS
cd C:\Users\Evgeny\Projects\Apix; tar -czf apix-deploy.tar.gz --exclude=node_modules --exclude=dist --exclude=.git .; scp apix-deploy.tar.gz root@91.142.90.200:/opt/apix-deploy.tar.gz; ssh root@91.142.90.200 "cd /opt/apix; docker compose down; tar -xzf /opt/apix-deploy.tar.gz -C /opt/apix; rm -f /opt/apix-deploy.tar.gz; docker compose build --no-cache server; docker compose up -d"

# Проверка логов
ssh root@91.142.90.200 "docker logs apix-server --tail 30"
