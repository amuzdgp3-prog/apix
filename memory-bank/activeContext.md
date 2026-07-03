# Текущий контекст работы — Apix (Slot Manager)

**Дата последнего обновления:** 03.07.2026, 20:07 MSK

## Текущий фокус
🚀 **Этап 6: Деплой на VDS** — идёт отладка Docker-сборки на VDS

## VDS Сервер (куплен 03.07.2026)
- Тариф: Turbo 4
- Домен: vm240994.vds.miran.ru
- IP: 91.142.90.200
- Доступ: root, SSH-ключ (id_rsa) — без пароля
- Проект в /opt/apix/

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

Задача для новой сессии — добавить в Dockerfile сервера копирование `packages/shared` целиком (src + dist) в production stage.

### Файлы для работы
- `apps/server/Dockerfile` — нужно исправить (добавить COPY --from=builder /app/packages/shared ./packages/shared)
- `docker-compose.yml` — ок
- `nginx.conf` — ок
- `.env.production` — ок

### Команды
```powershell
# Пересборка и деплой сервера на VDS
cd C:\Users\Evgeny\Projects\Apix; tar -czf apix-deploy.tar.gz --exclude=node_modules --exclude=dist --exclude=.git .; scp apix-deploy.tar.gz root@91.142.90.200:/opt/apix-deploy.tar.gz; ssh root@91.142.90.200 "cd /opt/apix; docker compose down; tar -xzf /opt/apix-deploy.tar.gz -C /opt/apix; rm -f /opt/apix-deploy.tar.gz; docker compose build --no-cache server; docker compose up -d"

# Проверка логов
ssh root@91.142.90.200 "docker logs apix-server --tail 30"