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
  DocumentWorkflow,
  DocumentVersion,
} from '../types/document';

const apiRoot = '/api/core/v1';
const defaultDocumentType = 'PDS_CONTRACT';

interface DocumentTypeCatalogResponse {
  items: Array<{ code?: string; id?: string; name: string }>;
  total: number;
}

interface CoreliaDocumentRecord {
  version?: number;
  currentVersion?: number;
  changeToken?: string;
  versionCreatedBy?: string;
  versionCreatedAt?: string;
  id: string;
  typeCode: string;
  typeName: string;
  attributes?: Partial<Pick<DocumentRecord, 'contractDate' | 'contractNumber' | 'snils'>>;
  status: DocumentRecord['approvalStatus'];
  statusLabel: DocumentRecord['documentStatus'];
  createdBy?: string;
  createdAt?: string;
  processInstanceId?: string;
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
  contractDate: document.attributes?.contractDate ?? '',
  contractNumber: document.attributes?.contractNumber ?? '',
  snils: document.attributes?.snils ?? '',
  approvalStatus: document.status,
  documentStatus: document.statusLabel,
  createdBy: document.createdBy,
  createdAt: document.createdAt,
  processInstanceId: document.processInstanceId,
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
  getVersions: (id: string, type = defaultDocumentType) => apiClient.get<{ items: DocumentVersion[] }>(
    `${apiRoot}/documents/${encodeURIComponent(type)}/${encodeURIComponent(id)}/versions`,
  ),
  getVersion: async (id: string, version: number, type = defaultDocumentType) => normalizeDocument(
    await apiClient.get<CoreliaDocumentRecord>(`${apiRoot}/documents/${encodeURIComponent(type)}/${encodeURIComponent(id)}/versions/${version}`),
  ),
  create: async ({ documentTypeId, ...attributes }: CreateDocumentRequest) => normalizeDocument(
    await apiClient.post<CoreliaDocumentRecord>(`${apiRoot}/documents/${encodeURIComponent(documentTypeId)}`, { attributes }),
  ),
  update: async (id: string, { documentTypeId, expectedVersion, changeToken, requestId, ...attributes }: UpdateDocumentRequest) => {
    const path = `${apiRoot}/documents/${encodeURIComponent(documentTypeId)}/${encodeURIComponent(id)}`;
    await apiClient.patch<CoreliaDocumentRecord>(path, { attributes, expectedVersion, changeToken, requestId });
    return normalizeDocument(await apiClient.get<CoreliaDocumentRecord>(path));
  },
  completeApproval: (id: string, payload: DocumentApprovalRequest) =>
    apiClient.post<DocumentRecord>(`${apiRoot}/tasks/${encodeURIComponent(id)}/action`, payload),
  uploadAttachments: (documentId: string, attachments: AttachmentUpload[], requestId: string = crypto.randomUUID()) =>
    apiClient.post<Attachment[]>(`${apiRoot}/documents/${defaultDocumentType}/${encodeURIComponent(documentId)}/attachments`, { attachments, requestId }),
  replaceAttachment: (attachmentId: string, attachment: AttachmentUpload) =>
    apiClient.put<Attachment>(`${apiRoot}/attachments/${encodeURIComponent(attachmentId)}`, { attachments: [attachment], requestId: crypto.randomUUID() }),
  deleteAttachment: (attachmentId: string) =>
    apiClient.delete<void>(`${apiRoot}/attachments/${encodeURIComponent(attachmentId)}?requestId=${crypto.randomUUID()}`),
  getAttachmentVersions: (attachmentId: string) =>
    apiClient.get<Attachment[]>(`${apiRoot}/attachments/${encodeURIComponent(attachmentId)}/versions`),
  attachmentUrl,
  downloadAttachment,
};
