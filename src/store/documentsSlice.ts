import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { documentsApi } from '../api/documents';
import type {
  AttachmentUpload,
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
  filters: {},
  loading: false,
  saving: false,
  error: null,
};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Неизвестная ошибка');

export const fetchDocuments = createAsyncThunk('documents/fetchAll', async (filters: DocumentSearchRequest, api) => {
  try {
    return await documentsApi.search(filters);
  } catch (error) {
    return api.rejectWithValue(errorMessage(error));
  }
});

export const fetchDocumentById = createAsyncThunk('documents/fetchById', async (id: string, api) => {
  try {
    return await documentsApi.getById(id);
  } catch (error) {
    return api.rejectWithValue(errorMessage(error));
  }
});

export const fetchCurrentUser = createAsyncThunk('documents/fetchCurrentUser', async (_, api) => {
  try {
    return await documentsApi.getCurrentUser();
  } catch (error) {
    return api.rejectWithValue(errorMessage(error));
  }
});

export const fetchDocumentTypes = createAsyncThunk('documents/fetchDocumentTypes', async (_, api) => {
  try {
    return await documentsApi.getDocumentTypes();
  } catch (error) {
    return api.rejectWithValue(errorMessage(error));
  }
});

export const createDocument = createAsyncThunk('documents/create', async (payload: CreateDocumentRequest, api) => {
  try {
    return await documentsApi.create(payload);
  } catch (error) {
    return api.rejectWithValue(errorMessage(error));
  }
});

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
        const itemIndex = state.items.findIndex((item) => item.id === action.payload.id);
        if (itemIndex >= 0) state.items[itemIndex] = action.payload;
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
        const itemIndex = state.items.findIndex((item) => item.id === action.payload.id);
        if (itemIndex >= 0) state.items[itemIndex] = action.payload;
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
      })
      .addCase(uploadDocumentAttachments.rejected, (state, action) => {
        state.saving = false;
        state.error = String(action.payload ?? action.error.message);
      });
  },
});

export const { setFilters, clearCurrentDocument, clearError } = documentsSlice.actions;
export default documentsSlice.reducer;
