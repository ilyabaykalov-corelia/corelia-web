# Реализация React

## Стек и структура

В package.json используются React 19, TypeScript 7, Vite 8, MUI 9, Redux Toolkit и React Router. Точные ограничения версий находятся в [package.json](../package.json), зафиксированное дерево — в package-lock.json.

| Область | Основные исходники |
| --- | --- |
| Инициализация и маршрутизация | [main.tsx](../src/main.tsx), [App.tsx](../src/App.tsx) |
| Оболочка и тема | [AppLayout.tsx](../src/components/AppLayout.tsx), src/theme/theme.ts |
| Экраны | src/pages: LoginPage, HomePage, DocumentsListPage, DocumentCreatePage, DocumentDetailPage, TasksListPage |
| HTTP и сессия | [client.ts](../src/api/client.ts), [authStorage.ts](../src/api/authStorage.ts), src/api/auth.ts |
| Документы и задачи | [documents.ts](../src/api/documents.ts), [tasks.ts](../src/api/tasks.ts) |
| Redux | src/store/index.ts, authSlice.ts, documentsSlice.ts, hooks.ts |
| Типы | src/types/document.ts, task.ts, auth.ts |
| Формы | src/features/documents/components/KidOpsFields.tsx, utils/documentValidation.ts |
| Файлы | DocumentFilesList, FilePreviewDialog, DocxDocumentPreview, ExcelWorkbookPreview, src/utils/file.ts |

## Маршруты

| Путь | Экран |
| --- | --- |
| /login | Вход |
| / | Главная |
| /documents | Реестр |
| /documents/new | Создание |
| /documents/:id | Карточка и выбор исторической версии |
| /tasks/my | Мои задачи |
| /tasks/available | Доступные задачи |

/tasks перенаправляет на /tasks/my, неизвестный путь — на /. ProtectedApp проверяет наличие сессии в Redux; отсутствие ведёт на /login. Это клиентская навигация, не криптографическая проверка JWT.

## Сессия и HTTP

API по умолчанию расположен на http://localhost:7170; VITE_API_BASE_URL переопределяет адрес, пустая строка оставляет тот же origin. Общий client.ts добавляет Bearer и JSON-заголовки. После 401 вне auth-маршрутов пытается выполнить refresh и один раз повторяет запрос. При неуспешной авторизации очищает сессию и уведомляет приложение событиями.

Сессия хранится в localStorage под ключом sber-npf.auth.session, включая accessToken и refreshToken. Проверка isJwt проверяет только структуру из трёх частей, а не подпись. Реальная проверка токена выполняется ядром. Обновление сессии синхронизируется через события auth-session-changed и auth-unauthorized.

Скачивание вложения использует отдельный fetch в documents.ts и текущий Bearer; общего механизма refresh для него нет. Нельзя переносить гарантию повторного запроса JSON-клиента на скачивание. Общей координации параллельных refresh в client.ts нет.

## Контракт документов

Corelia возвращает typeCode, typeName, attributes, status и statusLabel. normalizeDocument преобразует их в documentTypeId, documentType, плоские поля формы и documentStatus, сохраняет сведения о версии, changeToken, workflow и attachments.

Поиск с documentTypeId идёт в типизированный маршрут, без него — в общий /documents/search. Для чтения по неизвестному виду используется /documents/by-id/{id}. История читается через /documents/{type}/{id}/versions и /versions/{version}.

При сохранении реквизитов client отправляет attributes, expectedVersion, changeToken и requestId; после PATCH заново читает карточку. Если этот GET не удался, сама запись уже могла завершиться. Ошибку такого сценария нельзя считать доказательством отката.

Клиент не отправляет status через PATCH. Process action передаётся отдельным маршрутом /tasks/{id}/action. Из карточки может использоваться ID документа, совместимый fallback реализован gateway; очередь использует ID задачи.

## Создание и восстановление

DocumentCreatePage преобразует файлы в base64 до создания. Для КИД ОПС первый файл передаётся как initialAttachment, остальные загружаются после создания. Для ПДС файлы добавляются после карточки. UUID создания хранится в ref формы.

После создания сохраняется пакет documentId, attachments, requestId для дополнительных файлов. При ошибке pendingUpload удерживает точный пакет для повтора. Он не сохраняется в localStorage: восстановление после перезагрузки страницы не реализовано. Передача requestId при создании ПДС не означает, что backend гарантирует идемпотентность этого сценария.

## Редактирование и файлы

DocumentDetailPage сохраняет expectedVersion и changeToken на старте редактирования и генерирует requestId формы. При ошибке выводит сообщение; автоматического merge и перечитывания для разрешения 409 нет. Выбор исторической версии загружает отдельную карточку; действия блокируются также на время её загрузки.

Загрузка файлов отправляет массив attachments и requestId. Замена отправляет один файл, удаление — requestId в query. replaceAttachment и deleteAttachment генерируют новый UUID при каждом вызове; повторный ручной вызов не гарантирует повтор исходной команды. Семантику повторов нельзя считать одинаковой для всех форм.

FileReader преобразует файлы в base64, скачивание буферизует blob. PDF отображается в iframe через object URL, DOCX — docx-preview, XLSX — ExcelJS. Формат предпросмотра определяется расширением. Потоковая передача больших файлов не реализована.

## Изменения и проверки

Новое поле требует согласования типов, преобразования attributes, формы, клиентской проверки и backend-контракта. Новое процессное действие должно приходить из ядра. Общие бизнес-правила не добавлять в UI как единственное место проверки.

Порядок проверки: [development.md](development.md). Контракт ядра в общей папке: [Corelia API](../../corelia/docs/api.md).
