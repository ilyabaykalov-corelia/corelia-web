# Разработка и проверки

Все команды выполняются из `corelia-web`.

```bash
npm ci
npm run dev
```

Vite слушает все интерфейсы и по умолчанию использует порт `7171`. API base
задаётся `VITE_API_BASE_URL`; параметры Keycloak — `VITE_KEYCLOAK_URL`,
`VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID`. Значения `VITE_*` попадают
в browser bundle, поэтому секреты в них запрещены. Для production SPA нужен
fallback web-сервера на `index.html` и корректный CORS gateway.

Для customer-specific branding сначала выполните из корня Corelia
`./corelia.sh build --config-dir <package> --release-name <release>`.
Собранный `/branding.json` и ресурсы остаются в публичной директории при
`npm run dev`; отдельная переменная окружения для запуска dev-сервера не нужна.

```bash
npm run lint
npm test
npm run build
npm run preview
```

`lint` выполняет `tsc --noEmit`; `test` запускает `node --test tests/*.test.mjs`;
`build` запускает TypeScript compiler и Vite, результат находится в `dist`;
`preview` отдаёт готовую сборку. Некоторые тесты используют fixtures из
workspace Corelia, поэтому не являются проверкой внешнего production стенда.

Для ручной проверки после изменения UI пройдите вход, пустой/ошибочный
реестр, create/update с 409, историю, загрузку/скачивание файла, обе task
очереди и workflow admin. Не выводите токены или содержимое файлов в console.
