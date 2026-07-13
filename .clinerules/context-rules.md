# Правила управления контекстом

При поиске и чтении файлов в проекте ОБЯЗАТЕЛЬНО игнорировать:
- node_modules/
- dist/
- build/
- .pnpm-store/
- *.log
- *.lock
- *.min.js
- *.map
- Все файлы из .gitignore, если они попали в рабочую область

Никогда не читать целиком большие автосгенерированные файлы (например,
drizzle миграции) — только конкретные строки, если это необходимо.

Перед чтением файла, который может быть большим (>500 строк), сначала
оценить его размер и спросить пользователя.

---

## Все правила PowerShell → см. `.clinerules/powershell-mandatory.md`

Это включает:
- Таблицу замен (bash → PowerShell)
- Правило предотвращения зависаний
- Правило проверки TypeScript
- Стандартные шаблоны команд

---

## Ограничения при записи файлов

Если файл превышает ~2500 токенов, не пытайся записать его одним вызовом write_to_file.
Вместо этого:
- Создай файл с базовой структурой через write_to_file.
- Добавляй остальные блоки через несколько вызовов replace_in_file.
- Всегда проверяй, не обрезался ли файл, и дописывай остаток.

---

## ЗАПРЕТ на временные скрипты и ручную работу с файлами через Node.js

- НИКОГДА не создавай временные JS-скрипты (например, `_tmp_write.js`, `fix_file.js`) для работы с файлами.
- НИКОГДА не используй `fs.writeFileSync` или `require("fs")` в таких скриптах.
- Для создания/редактирования файлов используй ТОЛЬКО предоставленные инструменты:
  - `write_to_file` — для новых или полной перезаписи файлов.
  - `replace_in_file` — для частичного редактирования существующих файлов.
- Если файл слишком большой для одной операции — разбей его на несколько вызовов `replace_in_file`.

---

## Правило быстрого прототипирования React-макетов

Если пользователь просит показать макет страницы, интерфейса или компонента:

1. **Создать один HTML-файл** с React и ReactDOM через CDN.
2. **Использовать только `write_to_file`** (не редактор, не `replace_in_file`).
3. **Именовать файл** по шаблону: `_prototype_<описание>.html` (например, `_prototype_login.html`).
4. **Разместить файл** в корне проекта (Apix).

**Шаблон HTML-файла:**
```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Прототип: <описание></title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        /* стили компонента */
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState } = React;

        function App() {
            // компонент
            return (
                <div>
                    {/* разметка */}
                </div>
            );
        }

        ReactDOM.render(<App />, document.getElementById("root"));
    </script>
</body>
</html>
```

После создания файла открыть его в браузере:

- Если доступен Playwright — открыть через `browser_action` и сделать скриншот.
- Если нет — открыть командой `Start-Process "_prototype_<описание>.html"`.

После завершения удалить временный файл, если пользователь не попросил сохранить его.
 "ПЕРЕД ЛЮБЫМИ SSH-КОМАНДАМИ, КОТОРЫЕ ИЗМЕНЯЮТ ФАЙЛЫ ИЛИ ПЕРЕЗАПУСКАЮТ СЛУЖБЫ, ОБЯЗАТЕЛЬНО СОЗДАЙ БЭКАП КОНФИГОВ: mkdir -p /backup && tar -czf /backup/config_$(date +%Y%m%d_%H%M%S).tar.gz /etc/nginx /etc/php* /etc/apache2 /etc/supervisor /etc/systemd/system/*.service /var/www/*/.env 2>/dev/null. Если архивация не удалась (код возврата != 0) — ОСТАНОВИСЬ и сообщи мне. После успешного бэкапа продолжай деплой. При любой ошибке — откатывай конфиги из последнего архива."