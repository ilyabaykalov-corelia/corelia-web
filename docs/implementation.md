# Реализация Corelia Web

## Границы и маршруты

`App.tsx` защищает маршруты `/`, `/documents`, `/documents/new`,
`/documents/:id`, `/tasks/my`, `/tasks/available` и `/admin/workflows`; `/login`
доступен без сессии. `api/client.ts` формирует URL с
`VITE_API_BASE_URL` (по умолчанию `http://localhost:7170`), добавляет Bearer
token, один раз пытается refresh после 401 и очищает сессию при неуспехе.

`api/documents.ts`, `tasks.ts` и `workflows.ts` адаптируют `/api/core/v1` к
UI-моделям. Они не содержат URL внутренних сервисов или provider DTO.
Скачивание binary использует отдельный fetch с Bearer и не проходит общий
JSON-refresh wrapper.

## Сессия и состояние

`api/keycloak.ts` использует Keycloak Authorization Code + PKCE (`S256`) и
`check-sso`; `authStorage.ts` держит access token только в памяти вкладки и
рассылает browser events. `VITE_AUTH_FIXTURE=true` включает fixture-session
для тестов, а не production login.

Redux slices хранят каталог/реестр/карточку и task counters. Формы используют
`DocumentType.schema` и `ui` metadata; client-side validation и маски служат
только удобству. Незнакомые исторические attributes сохраняются в generic
record, а не преобразуются в фиксированную модель вида.

## Branding и BPMN

До монтирования React `main.tsx` загружает `/branding.json`; при ошибке
используются defaults. При `./corelia.sh build --config-dir ...` скрипт сборки
передаёт compiled runtime configuration во frontend: `branding/branding.json`
становится `/branding.json`, а файлы из `branding/assets/` — публичными
ресурсами `/branding/`. Это устраняет зависимость frontend от имени customer
package; абсолютные локальные пути к ресурсам нормализуются в `/branding/`.
Workflow admin работает с draft/validate/publish/
import/export/audit endpoint и передаёт BPMN XML серверу; validation и
deployment принадлежат workflow-service. Процессы из customer configuration
и published definitions без связанного draft открываются через `/view` в том
же BPMN-компоненте, но без возможности изменения.
