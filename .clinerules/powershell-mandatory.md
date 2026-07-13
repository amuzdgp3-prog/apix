# ЖЁСТКИЕ ПРАВИЛА POWERSHELL (Windows)

Ты работаешь в PowerShell. Bash-синтаксис и некоторые команды PowerShell ЗАПРЕЩЕНЫ, потому что они вызывают зависания.

---

## 1. Таблица замен (ВЫУЧИТЬ)

| Действие | ❌ Запрещено (почему) | ✅ Правильно |
|---|---|---|
| Последовательность команд | `&&` (синтаксис bash) | `;` |
| Перенаправление ошибок | `2>&1` (синтаксис bash) | `*>&1` |
| HTTP-запрос к API | `curl -s` (псевдоним Invoke-WebRequest) | `Invoke-WebRequest -Uri "http://..." -UseBasicParsing -TimeoutSec 5` |
| Проверка Vite/фронтенда | `Invoke-WebRequest http://localhost:5173` (НИКОГДА! Зависнет) | Только `netstat -ano \| findstr ":5173"` или открыть браузер |
| Переменная окружения | `export VAR=value` (синтаксис bash) | `$env:VAR = "value"` |
| Фоновый процесс | `command &` (синтаксис bash) | `Start-Process powershell -ArgumentList "-NoExit", "-Command", "command"` |
| Экранирование строк | `'it'\''s'` (синтаксис bash) | `"it's"` или `'it''s'` |
| Ожидание | `sleep 5` | `Start-Sleep -Seconds 5` |
| Проверка ошибки | `$?` (ненадёжно) | `$LASTEXITCODE` |

---

## 2. Правило предотвращения зависаний (ИСПОЛНЯТЬ СТРОГО)

Любая команда PowerShell может зависнуть по трём причинам:
1. Ожидание ручного подтверждения (`requires_approval: true` для безвредной операции).
2. Захват вывода в терминал без перенаправления.
3. Сложный однострочник с `if/else` + пайпами.

### А. Всегда `requires_approval: false` для безопасных операций
Безопасные операции — те, которые НЕ изменяют файловую систему, НЕ устанавливают пакеты, НЕ удаляют файлы:
- `Test-Path` (проверка существования файла/папки)
- `Get-Content` (чтение файла)
- `netstat -ano | findstr ":PORT"` (проверка порта)
- `Test-NetConnection` (проверка сетевого подключения)
- `npx tsc --noEmit` (проверка типов, не изменяет файлы)
- `node --version`, `pnpm --version` (версии инструментов)
- `ls`, `dir`, `Get-ChildItem` (список файлов)

❌ **НИКОГДА** не использовать `requires_approval: true` для этих команд.
✅ Всегда `requires_approval: false`.

### Б. Всегда перенаправлять вывод в файл
Любой вывод PowerShell, который может быть объёмным, ОБЯЗАН быть направлен в файл:
```powershell
команда *>&1 | Out-File -FilePath результат.txt -Encoding UTF8
```
Затем файл читается инструментом `read_file`. Никогда не полагаться на захват вывода из терминала.

### В. Разбивать сложные однострочники
❌ Запрещено:
```powershell
if (Test-Path "file") { Get-Content "file" *>&1 | Out-File result.txt } else { ... }
```
✅ Правильно — два отдельных шага:
```powershell
# Шаг 1: проверка существования
Test-Path "путь/к/файлу" *>&1 | Out-File -FilePath check.txt -Encoding UTF8
# Шаг 2 (после чтения check.txt): чтение содержимого
Get-Content "путь/к/файлу" *>&1 | Out-File -FilePath content.txt -Encoding UTF8
```

### Г. Очистка временных файлов
После завершения задачи удалить все временные файлы:
```powershell
Remove-Item -Force *.txt_временный -ErrorAction SilentlyContinue
```

---

## 3. Правило проверки TypeScript (ИСПОЛНЯТЬ СТРОГО)

При любой проверке компиляции TypeScript (tsc) НИКОГДА не полагаться на захват вывода из терминала.

1. Запустить компиляцию с перенаправлением ВСЕХ потоков в файл:
   ```
   cd c:\Users\Evgeny\Projects\Apix\apps\server; npx tsc --noEmit *>&1 | Out-File -FilePath tsc_output.txt -Encoding UTF8
   ```
2. Прочитать файл `tsc_output.txt` инструментом `read_file`.
3. Если файл пустой — ошибок нет. Если содержит текст — проанализировать ошибки.
4. После анализа удалить файл: `Remove-Item tsc_output.txt`.

---

## 4. Стандартные шаблоны (копируй 1-в-1)

### Проверка TypeScript (сервер)
```powershell
cd apps/server; npx tsc --noEmit *>&1 | Out-File -FilePath tsc_output.txt -Encoding UTF8; if ((Get-Item tsc_output.txt).Length -gt 0) { Write-Host "Ошибки компиляции:"; Get-Content tsc_output.txt } else { Write-Host "Компиляция чистая" }
```

### Проверка TypeScript (клиент)
```powershell
cd apps/client; npx tsc --noEmit *>&1 | Out-File -FilePath tsc_output.txt -Encoding UTF8
```

### Проверка, слушается ли порт
```powershell
netstat -ano | findstr ":3000"
netstat -ano | findstr ":5173"
```
Если в выводе есть `LISTENING` — сервер/клиент работает.

### Проверка API-эндпоинта (ТОЛЬКО для бэкенда)
```powershell
try { $r = Invoke-WebRequest -Uri "http://localhost:3000/api/machines" -UseBasicParsing -TimeoutSec 5; Write-Host "Сервер отвечает:" $r.StatusCode } catch { Write-Host "Сервер недоступен: $_" }
```
**Важно:** `TimeoutSec 5` обязателен. Без него команда может зависнуть навсегда.

### Запуск сервера в фоне
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\Evgeny\Projects\Apix\apps\server; npx tsx src/index.ts"
```

### Запуск клиента в фоне
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\Evgeny\Projects\Apix\apps\client; npx vite"
```

---

## 5. Что делать, если команда зависла

1. Нажми Ctrl+C в терминале PowerShell, где она выполняется.
2. Если не помогает — закрой окно терминала.
3. Проверь порт через `netstat`. Если процесс остался висеть — убей его: `taskkill /F /PID <номер>`.

---

## 6. Что делать, если команда не работает

1. Проверь, не использовал ли ты запрещённый синтаксис из таблицы выше.
2. Замени на правильный аналог.
3. При 2 неудачных попытках — спроси пользователя.