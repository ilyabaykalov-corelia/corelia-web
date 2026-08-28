import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { documentsApi } from '../api/documents';
import type {
  AttachmentUpload,
  Attachment,
  CreateDocumentRequest,
  CurrentUser,
  DocumentApprovalRequest,
  DocumentType,
  DocumentRecord,
  DocumentSearchRequest,
  UpdateDocumentRequest,
} from '../types/document';

interface DocumentsState {
  items: DocumentRecord[];
  total: number;
  currentItem: DocumentRecord | null;
  currentUser: CurrentUser | null;
  documentTypes: DocumentType[];
  registryYears: number[];
  registryYearsByDocumentType: Record<string, number[]>;
  filters: DocumentSearchRequest;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: DocumentsState = {
  items: [],
  total: 0,
  currentItem: null,
  currentUser: null,
  documentTypes: [],
  registryYears: [],
  registryYearsByDocumentType: {},
  filters: {},
  loading: false,
  saving: false,
  error: null,
};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Неизвестная ошибка');

/**
 * Добавляет документ в начало реестра или заменяет существующую запись с тем же id.
 *
 * @param items - Текущий список документов в Redux-состоянии.
 * @param document - Документ, который нужно синхронизировать со списком.
 * @returns `true`, если документ был добавлен как новая запись.
 */
const upsertDocument = (items: DocumentRecord[], document: DocumentRecord) => {
  const itemIndex = items.findIndex((item) => item.id === document.id);
  if (itemIndex >= 0) {
    items[itemIndex] = document;
    return false;
  }

  items.unshift(document);
  return true;
};

/**
 * Добавляет год документа в список годов реестра, сохраняя сортировку от нового года к старому.
 *
 * @param years - Текущий список годов в Redux-состоянии.
 * @param contractDate - Дата договора, из которой извлекается год.
 */
const includeRegistryYear = (years: number[], contractDate: string) => {
  const year = Number(contractDate.slice(0, 4));
  if (!Number.isFinite(year) || years.includes(year)) return;
  years.push(year);
  years.sort((left, right) => right - left);
};

/**
 * Добавляет год документа в индекс годов конкретного вида документа.
 *
 * @param yearsByDocumentType - Индекс годов по идентификатору вида документа.
 * @param document - Документ, из которого берутся вид документа и год договора.
 */
const includeDocumentTypeYear = (yearsByDocumentType: Record<string, number[]>, document: DocumentRecord) => {
  const year = Number(document.contractDate.slice(0, 4));
  if (!Number.isFinite(year)) return;

  const years = yearsByDocumentType[document.documentTypeId] ?? [];
  if (years.includes(year)) return;

  yearsByDocumentType[document.documentTypeId] = [...years, year].sort((left, right) => right - left);
};

/**
 * Загружает страницу реестра документов с учетом фильтров через API-слой.
 *
 * @param filters - Фильтры поиска, дат, статуса и пагинации для реестра.
 */
export const fetchDocuments = createAsyncThunk('documents/fetchAll', async (filters: DocumentSearchRequest, api) => {
  try {
    return await documentsApi.search(filters);
  } catch (error) {
    return api.rejectWithValue(errorMessage(error));
  }
});

/**
 * Загружает одну карточку документа по идентификатору и сохраняет ее как текущий документ.
 *
 * @param id - Идентификатор документа из маршрута.
 */
export const fetchDocumentById = createAsyncThunk('documents/fetchById', async (id: string, api) => {
  try {
    return await documentsApi.getById(id);
  } catch (error) {
    return api.rejectWithValue(errorMessage(error));
  }
});

/**
 * Загружает профиль пользователя, отображаемый в оболочке приложения.
 */
export const fetchCurrentUser = createAsyncThunk('documents/fetchCurrentUser', async (_, api) => {
  try {
    return await documentsApi.getCurrentUser();
  } catch (error) {
    return api.rejectWithValue(errorMessage(error));
  }
});

/**
 * Загружает доступные виды документов для форм создания и редактирования.
 */
export const fetchDocumentTypes = createAsyncThunk('documents/fetchDocumentTypes', async (_, api) => {
  try {
    return await documentsApi.getDocumentTypes();
  } catch (error) {
    return api.rejectWithValue(errorMessage(error));
  }
});

/**
 * Создает карточку документа без вложений.
 *
 * @param payload - Валидированные атрибуты документа.
 */
export const createDocument = createAsyncThunk('documents/create', async (payload: CreateDocumentRequest, api) => {
  try {
    return await documentsApi.create(payload);
  } catch (error) {
    return api.rejectWithValue(errorMessage(error));
  }
});

/**
 * Обновляет редактируемые атрибуты карточки документа.
 *
 * @param args - Идентификатор целевого документа и payload обновления.
 */
export const updateDocument = createAsyncThunk(
  'documents/update',
  async ({ id, payload }: { id: string; payload: UpdateDocumentRequest }, api) => {
    try {
      return await documentsApi.update(id, payload);
    } catch (error) {
      return api.rejectWithValue(errorMessage(error));
    }
  },
);

/**
 * Завершает согласование карточки документа.
 *
 * @param args - Идентификатор целевого документа и решение по согласованию.
 */
export const completeDocumentApproval = createAsyncThunk(
  'documents/completeApproval',
  async ({ id, payload }: { id: string; payload: DocumentApprovalRequest }, api) => {
    try {
      return await documentsApi.completeApproval(id, payload);
    } catch (error) {
      return api.rejectWithValue(errorMessage(error));
    }
  },
);

/**
 * Загружает подготовленные payload-ы вложений и обновляет карточку документа после загрузки.
 *
 * @param args - Идентификатор целевого документа и файлы, преобразованные в API payload.
 */
export const uploadDocumentAttachments = createAsyncThunk(
  'documents/uploadAttachments',
  async ({ documentId, attachments }: { documentId: string; attachments: AttachmentUpload[] }, api) => {
    try {
      await documentsApi.uploadAttachments(documentId, attachments);
      return await documentsApi.getById(documentId);
    } catch (error) {
      return api.rejectWithValue(errorMessage(error));
    }
  },
);

/**
 * Скачивает сохраненное вложение через Redux, чтобы React-компоненты не обращались к API-слою напрямую.
 *
 * @param attachment - Метаданные вложения для построения API-запроса и имени результирующего файла.
 */
export const downloadDocumentAttachment = createAsyncThunk('documents/downloadAttachment', async (attachment: Attachment, api) => {
  try {
    return await documentsApi.downloadAttachment(attachment);
  } catch (error) {
    return api.rejectWithValue(errorMessage(error));
  }
});

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<DocumentSearchRequest>) => {
      state.filters = action.payload;
    },
    clearCurrentDocument: (state) => {
      state.currentItem = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
        action.payload.items.forEach((document) => {
          includeRegistryYear(state.registryYears, document.contractDate);
          includeDocumentTypeYear(state.registryYearsByDocumentType, document);
        });
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = String(action.payload ?? action.error.message);
      })
      .addCase(fetchDocumentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocumentById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentItem = {
          ...action.payload,
          processInstanceId:
            action.payload.processInstanceId ??
            (state.currentItem?.id === action.payload.id ? state.currentItem.processInstanceId : undefined),
        };
      })
      .addCase(fetchDocumentById.rejected, (state, action) => {
        state.loading = false;
        state.error = String(action.payload ?? action.error.message);
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.currentUser = action.payload;
      })
      .addCase(fetchDocumentTypes.fulfilled, (state, action) => {
        state.documentTypes = action.payload.items;
      })
      .addCase(fetchDocumentTypes.rejected, (state, action) => {
        state.error = String(action.payload ?? action.error.message);
      })
      .addCase(createDocument.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createDocument.fulfilled, (state, action) => {
        state.saving = false;
        state.currentItem = action.payload;
        includeRegistryYear(state.registryYears, action.payload.contractDate);
        includeDocumentTypeYear(state.registryYearsByDocumentType, action.payload);
        if (upsertDocument(state.items, action.payload)) state.total += 1;
      })
      .addCase(createDocument.rejected, (state, action) => {
        state.saving = false;
        state.error = String(action.payload ?? action.error.message);
      })
      .addCase(updateDocument.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateDocument.fulfilled, (state, action) => {
        state.saving = false;
        state.currentItem = action.payload;
        includeRegistryYear(state.registryYears, action.payload.contractDate);
        includeDocumentTypeYear(state.registryYearsByDocumentType, action.payload);
        upsertDocument(state.items, action.payload);
      })
      .addCase(updateDocument.rejected, (state, action) => {
        state.saving = false;
        state.error = String(action.payload ?? action.error.message);
      })
      .addCase(completeDocumentApproval.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(completeDocumentApproval.fulfilled, (state, action) => {
        state.saving = false;
        state.currentItem = action.payload;
        includeRegistryYear(state.registryYears, action.payload.contractDate);
        includeDocumentTypeYear(state.registryYearsByDocumentType, action.payload);
        upsertDocument(state.items, action.payload);
      })
      .addCase(completeDocumentApproval.rejected, (state, action) => {
        state.saving = false;
        state.error = String(action.payload ?? action.error.message);
      })
      .addCase(uploadDocumentAttachments.pending, (state) => {
        state.saving = true;
      })
      .addCase(uploadDocumentAttachments.fulfilled, (state, action) => {
        state.saving = false;
        state.currentItem = {
          ...action.payload,
          processInstanceId:
            action.payload.processInstanceId ??
            (state.currentItem?.id === action.payload.id ? state.currentItem.processInstanceId : undefined),
        };
        includeRegistryYear(state.registryYears, state.currentItem.contractDate);
        includeDocumentTypeYear(state.registryYearsByDocumentType, state.currentItem);
        upsertDocument(state.items, state.currentItem);
      })
      .addCase(uploadDocumentAttachments.rejected, (state, action) => {
        state.saving = false;
        state.error = String(action.payload ?? action.error.message);
      });
  },
});

export const { setFilters, clearCurrentDocument, clearError } = documentsSlice.actions;
export default documentsSlice.reducer;
