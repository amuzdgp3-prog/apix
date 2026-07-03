# Шпаргалка PowerShell для Cline

| Действие | Команда |
|---|---|
| Перейти в папку и выполнить | `cd путь/к/папке; команда` |
| Выполнить npm/npx | `npx tsc --noEmit` |
| Проверить ошибку | `$LASTEXITCODE` |
| Установить переменную | `$env:PGPASSWORD = "secret"` |
| Результат в файл | `команда *>&1 | Out-File -FilePath лог.txt` |
| Убить процесс | `taskkill /F /PID число` |