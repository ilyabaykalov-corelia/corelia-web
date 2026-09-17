# Corelia Web

Универсальный интерфейс документооборота на React, TypeScript и Vite. Формы, колонки, статусы и вложения настраиваются через каталог Corelia. СберНПФ — одна из конфигураций. Имя npm-пакета corelia-web; рабочий каталог и Git remote сохранены для совместимости.

## Документация

- [Продукт](docs/product.md) — пользователи и сценарии.
- [Реализация](docs/implementation.md) — карта кода, API, сессия и состояние форм.
- [Разработка и проверки](docs/development.md) — запуск, сборка и ручные сценарии.
- [Навигация](docs/README.md) и [инструкции для агентов](AGENTS.md).

## Запуск

Нужны Node.js/npm, совместимые с зависимостями [package.json](package.json) и [package-lock.json](package-lock.json), и доступный gateway Corelia.

Из корня этого репозитория:

```bash
npm ci
npm run dev
```

Dev-сервер настроен на порт 7171, API по умолчанию — `http://localhost:7170`. Для другого API задайте `VITE_API_BASE_URL` по [.env.example](.env.example). Пустое значение означает запросы к origin интерфейса. Параметры Vite попадают в клиентскую сборку, секреты в них не размещать.

```bash
npm run lint
npm run build
npm run preview
```

lint выполняет `tsc --noEmit`; build — `tsc && vite build`, результат в dist. `npm test` проверяет контракты метаданных и API на двух конфигурациях из соседнего Corelia. Preview служит просмотру сборки. Для production-хостинга SPA требуется fallback на index.html для клиентских маршрутов.

Обязательные проверки прав и изменения данных выполняет Corelia. Прямые записи из React в DataSpace и BPM не являются частью клиентского контракта.
