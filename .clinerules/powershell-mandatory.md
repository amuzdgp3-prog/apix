# ЖЁСТКИЕ ПРАВИЛА POWERSHELL (Windows)

Ты работаешь в PowerShell. Bash-синтаксис и некоторые команды PowerShell ЗАПРЕЩЕНЫ, потому что они вызывают зависания.

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

## 2. Стандартные шаблоны (копируй 1-в-1)

### Проверка TypeScript
```powershell
cd apps/server; npx tsc --noEmit *>&1 | Out-File -FilePath tsc_output.txt -Encoding UTF8; if ((Get-Item tsc_output.txt).Length -gt 0) { Write-Host "Ошибки компиляции:"; Get-Content tsc_output.txt } else { Write-Host "Компиляция чистая" }
Проверка, слушается ли порт (СЕРВЕР или КЛИЕНТ)
powershell
netstat -ano | findstr ":3000"
netstat -ano | findstr ":5173"
Если в выводе есть LISTENING — сервер/клиент работает.

Проверка API-эндпоинта (ТОЛЬКО для бэкенда)
powershell
try { $r = Invoke-WebRequest -Uri "http://localhost:3000/api/machines" -UseBasicParsing -TimeoutSec 5; Write-Host "Сервер отвечает:" $r.StatusCode } catch { Write-Host "Сервер недоступен: $_" }
Важно: TimeoutSec 5 обязателен. Без него команда может зависнуть навсегда.

Запуск сервера в фоне
powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\Evgeny\Projects\Apix\apps\server; npx tsx src/index.ts"
Запуск клиента в фоне
powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\Evgeny\Projects\Apix\apps\client; npx vite"
3. Что делать, если команда зависла
Нажми Ctrl+C в терминале PowerShell, где она выполняется.

Если не помогает — закрой окно терминала.

Проверь порт через netstat. Если процесс остался висеть — убей его: taskkill /F /PID <номер>.

4. Что делать, если команда не работает
Проверь, не использовал ли ты запрещённый синтаксис из таблицы выше.

Замени на правильный аналог.

При 2 неудачных попытках — спроси пользователя.

text

---

### 📢 Команда для Cline после обновления файла

Как только файл будет сохранён, отправь Cline это сообщение:
Прочитай .clinerules/powershell-mandatory.md. Выучи таблицу замен и шаблоны.
Теперь продолжи Шаг 3 по новым правилам:

Проверь порт 5173 ТОЛЬКО через netstat (не Invoke-WebRequest).

Если порт не слушается — запусти клиент.

Если порт слушается — открой браузер Playwright и продолжай по плану.

text

Теперь проблема с зависанием `Invoke-WebRequest` на Vite решена системно. Можешь продолжать тестирование.

