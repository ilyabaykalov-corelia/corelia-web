import { ApiError, apiClient, buildApiUrl } from './client';
import { getStoredAccessToken } from './authStorage';
import type {
  Attachment,
  AttachmentUpload,
  CreateDocumentRequest,
  CurrentUser,
  DocumentApprovalRequest,
  DocumentTypesResponse,
  DocumentType,
  DocumentAttributes,
  DocumentRecord,
  DocumentSearchRequest,
  DocumentSearchResponse,
  UpdateDocumentRequest,
  DocumentWorkflow,
  DocumentVersion,
} from '../types/document';

const apiRoot = '/api/core/v1';
interface CoreliaDocumentRecord {
  version?: number;
  currentVersion?: number;
  changeToken?: string;
  versionCreatedBy?: string;
  versionCreatedAt?: string;
  id: string;
  typeCode: string;
  typeName: string;
  attributes?: DocumentAttributes;
  status: DocumentRecord['status'];
  statusLabel: DocumentRecord['documentStatus'];
  createdBy?: string;
  createdAt?: string;
  processInstanceId?: string;
  workflowCompleted?: boolean;
  workflow?: DocumentWorkflow;
  attachments?: Attachment[];
}

const normalizeDocument = (document: CoreliaDocumentRecord): DocumentRecord => ({
  version: document.version,
  currentVersion: document.currentVersion,
  changeToken: document.changeToken,
  versionCreatedBy: document.versionCreatedBy,
  versionCreatedAt: document.versionCreatedAt,
  id: document.id,
  documentTypeId: document.typeCode,
  documentType: document.typeName,
  attributes: document.attributes ?? {},
  status: document.status,
  documentStatus: document.statusLabel,
  createdBy: document.createdBy,
  createdAt: document.createdAt,
  processInstanceId: document.processInstanceId,
  workflowCompleted: document.workflowCompleted,
  workflow: document.workflow,
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
    const response = await apiClient.get<{ items: Array<DocumentType & { code: string }>; total: number }>(`${apiRoot}/document-types`);
    return {
      ...response,
      items: response.items
        .map((item) => ({ ...item, id: item.id ?? item.code ?? '' }))
        .filter((item) => item.id.length > 0),
    };
  },
  search: async (filters: DocumentSearchRequest): Promise<DocumentSearchResponse> => {
    const response = await apiClient.post<{ items: CoreliaDocumentRecord[]; total: number }>(
      filters.documentTypeId ? `${apiRoot}/documents/${encodeURIComponent(filters.documentTypeId)}/search` : `${apiRoot}/documents/search`,
      filters,
    );
    return { ...response, items: response.items.map(normalizeDocument) };
  },
  getById: async (id: string, type?: string) => normalizeDocument(
    await apiClient.get<CoreliaDocumentRecord>(type ? `${apiRoot}/documents/${encodeURIComponent(type)}/${encodeURIComponent(id)}` : `${apiRoot}/documents/by-id/${encodeURIComponent(id)}`),
  ),
  getCapabilities: (id: string, type: string) => apiClient.get<{ capabilities: string[] }>(
    `${apiRoot}/documents/${encodeURIComponent(type)}/${encodeURIComponent(id)}/capabilities`,
  ),
  getVersions: async (id: string, type?: string) => {
    const code = type ?? (await documentsApi.getById(id)).documentTypeId;
    return apiClient.get<{ items: DocumentVersion[] }>(`${apiRoot}/documents/${encodeURIComponent(code)}/${encodeURIComponent(id)}/versions`);
  },
  getVersion: async (id: string, version: number, type?: string): Promise<DocumentRecord> => {
    const code = type ?? (await documentsApi.getById(id)).documentTypeId;
    return normalizeDocument(await apiClient.get<CoreliaDocumentRecord>(`${apiRoot}/documents/${encodeURIComponent(code)}/${encodeURIComponent(id)}/versions/${version}`));
  },
  create: async ({ documentTypeId, initialAttachment, requestId, attributes }: CreateDocumentRequest) => normalizeDocument(
    await apiClient.post<CoreliaDocumentRecord>(`${apiRoot}/documents/${encodeURIComponent(documentTypeId)}`, { attributes, initialAttachment, requestId }),
  ),
  update: async (id: string, { documentTypeId, expectedVersion, changeToken, requestId, attributes }: UpdateDocumentRequest) => {
    const path = `${apiRoot}/documents/${encodeURIComponent(documentTypeId)}/${encodeURIComponent(id)}`;
    await apiClient.patch<CoreliaDocumentRecord>(path, { attributes, expectedVersion, changeToken, requestId });
    return normalizeDocument(await apiClient.get<CoreliaDocumentRecord>(path));
  },
  completeApproval: async (id: string, payload: DocumentApprovalRequest) => {
    if (!payload.actionCode) throw new Error('Действие не выбрано');
    const document = await documentsApi.getById(id);
    return normalizeDocument(await apiClient.post<CoreliaDocumentRecord>(`${apiRoot}/documents/${encodeURIComponent(document.documentTypeId)}/${encodeURIComponent(id)}/actions/${encodeURIComponent(payload.actionCode)}`, {}));
  },
  uploadAttachments: async (documentId: string, attachments: AttachmentUpload[], requestId: string = crypto.randomUUID()): Promise<Attachment[]> => {
    const type = (await documentsApi.getById(documentId)).documentTypeId;
    return apiClient.post<Attachment[]>(`${apiRoot}/documents/${encodeURIComponent(type)}/${encodeURIComponent(documentId)}/attachments`, { attachments, requestId });
  },
  replaceAttachment: (attachmentId: string, attachment: AttachmentUpload) =>
    apiClient.put<Attachment>(`${apiRoot}/attachments/${encodeURIComponent(attachmentId)}`, { attachments: [attachment], requestId: crypto.randomUUID() }),
  deleteAttachment: (attachmentId: string) =>
    apiClient.delete<void>(`${apiRoot}/attachments/${encodeURIComponent(attachmentId)}?requestId=${crypto.randomUUID()}`),
  getAttachmentVersions: (attachmentId: string) =>
    apiClient.get<Attachment[]>(`${apiRoot}/attachments/${encodeURIComponent(attachmentId)}/versions`),
  attachmentUrl,
  downloadAttachment,
};
