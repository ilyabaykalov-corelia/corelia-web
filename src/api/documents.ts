import { ApiError, apiClient, buildApiUrl } from './client';
import { getStoredAccessToken } from './authStorage';
import type {
  Attachment,
  AttachmentUpload,
  CreateDocumentRequest,
  CurrentUser,
  DocumentApprovalRequest,
  DocumentTypesResponse,
  DocumentRecord,
  DocumentSearchRequest,
  DocumentSearchResponse,
  UpdateDocumentRequest,
} from '../types/document';

const apiRoot = '/api/core/v1';
const defaultDocumentType = 'PDS_CONTRACT';

interface DocumentTypeCatalogResponse {
  items: Array<{ code?: string; id?: string; name: string }>;
  total: number;
}

interface CoreliaDocumentRecord {
  id: string;
  typeCode: string;
  typeName: string;
  attributes?: Partial<Pick<DocumentRecord, 'contractDate' | 'contractNumber' | 'snils'>>;
  status: DocumentRecord['approvalStatus'];
  statusLabel: DocumentRecord['documentStatus'];
  createdBy?: string;
  createdAt?: string;
  processInstanceId?: string;
  availableActions?: DocumentRecord['availableActions'];
  executor?: DocumentRecord['executor'];
  attachments?: Attachment[];
}

const normalizeDocument = (document: CoreliaDocumentRecord): DocumentRecord => ({
  id: document.id,
  documentTypeId: document.typeCode,
  documentType: document.typeName,
  contractDate: document.attributes?.contractDate ?? '',
  contractNumber: document.attributes?.contractNumber ?? '',
  snils: document.attributes?.snils ?? '',
  approvalStatus: document.status,
  documentStatus: document.statusLabel,
  createdBy: document.createdBy,
  createdAt: document.createdAt,
  processInstanceId: document.processInstanceId,
  availableActions: document.availableActions,
  executor: document.executor,
  attachments: document.attachments ?? [],
});

const attachmentUrl = (attachmentId: string) => buildApiUrl(`${apiRoot}/attachments/${encodeURIComponent(attachmentId)}`);

const downloadAttachment = async (attachment: Attachment) => {
  const headers = new Headers({ Accept: '*/*' });
  const accessToken = getStoredAccessToken();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(attachmentUrl(attachment.id), { headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Не удалось загрузить вложение' }));
    throw new ApiError(response.status, body.message ?? `Ошибка загрузки вложения: ${response.status}`);
  }

  const blob = await response.blob();
  return new File([blob], attachment.fileName, {
    type: attachment.contentType || blob.type,
    lastModified: new Date(attachment.uploadedAt).getTime() || Date.now(),
  });
};

export const documentsApi = {
  getCurrentUser: () => apiClient.get<CurrentUser>(`${apiRoot}/auth/me`),
  getDocumentTypes: async (): Promise<DocumentTypesResponse> => {
    const response = await apiClient.get<DocumentTypeCatalogResponse>(`${apiRoot}/document-types`);
    return {
      ...response,
      items: response.items
        .map((item) => ({ id: item.id ?? item.code ?? '', name: item.name }))
        .filter((item) => item.id.length > 0),
    };
  },
  search: async (filters: DocumentSearchRequest): Promise<DocumentSearchResponse> => {
    const response = await apiClient.post<{ items: CoreliaDocumentRecord[]; total: number }>(
      `${apiRoot}/documents/${encodeURIComponent(filters.documentTypeId ?? defaultDocumentType)}/search`,
      filters,
    );
    return { ...response, items: response.items.map(normalizeDocument) };
  },
  getById: async (id: string, type = defaultDocumentType) => normalizeDocument(
    await apiClient.get<CoreliaDocumentRecord>(`${apiRoot}/documents/${encodeURIComponent(type)}/${encodeURIComponent(id)}`),
  ),
  create: async ({ documentTypeId, ...attributes }: CreateDocumentRequest) => normalizeDocument(
    await apiClient.post<CoreliaDocumentRecord>(`${apiRoot}/documents/${encodeURIComponent(documentTypeId)}`, { attributes }),
  ),
  update: async (id: string, { documentTypeId, ...attributes }: UpdateDocumentRequest) => normalizeDocument(
    await apiClient.patch<CoreliaDocumentRecord>(`${apiRoot}/documents/${encodeURIComponent(documentTypeId)}/${encodeURIComponent(id)}`, { attributes }),
  ),
  completeApproval: (id: string, payload: DocumentApprovalRequest) =>
    apiClient.post<DocumentRecord>(`${apiRoot}/tasks/${encodeURIComponent(id)}/action`, payload),
  uploadAttachments: (documentId: string, attachments: AttachmentUpload[]) =>
    apiClient.post<Attachment[]>(`${apiRoot}/documents/${defaultDocumentType}/${encodeURIComponent(documentId)}/attachments`, { attachments }),
  replaceAttachment: (attachmentId: string, attachment: AttachmentUpload) =>
    apiClient.put<Attachment>(`${apiRoot}/attachments/${encodeURIComponent(attachmentId)}`, { attachments: [attachment] }),
  deleteAttachment: (attachmentId: string) =>
    apiClient.delete<void>(`${apiRoot}/attachments/${encodeURIComponent(attachmentId)}`),
  getAttachmentVersions: (attachmentId: string) =>
    apiClient.get<Attachment[]>(`${apiRoot}/attachments/${encodeURIComponent(attachmentId)}/versions`),
  attachmentUrl,
  downloadAttachment,
};
