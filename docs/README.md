# Документация Corelia Web

`corelia-web` — отдельный React/Vite-клиент Corelia, а не Compose service. Он
использует публичный gateway API и runtime branding, не обращается к data,
workflow, attachment service или S3 напрямую.

1. [Продукт](product.md) — реализованные пользовательские сценарии и границы.
2. [Реализация](implementation.md) — маршруты, API-клиенты, сессия и состояние.
3. [Разработка](development.md) — команды и применимые проверки.

Смежные контракты: [API Corelia](../../docs/api.md),
[configuration](../../docs/configuration.md), [branding](../../docs/branding.md).
