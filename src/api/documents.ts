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

const apiRoot = '/api/v1';

const attachmentUrl = (attachmentId: string) => buildApiUrl(`${apiRoot}/attachment/${attachmentId}`);

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
  getCurrentUser: () => apiClient.get<CurrentUser>(`${apiRoot}/user`),
  getDocumentTypes: () => apiClient.get<DocumentTypesResponse>(`${apiRoot}/document-types`),
  search: (filters: DocumentSearchRequest) =>
    apiClient.post<DocumentSearchResponse>(`${apiRoot}/document/search`, filters),
  getById: (id: string) => apiClient.get<DocumentRecord>(`${apiRoot}/document/${id}`),
  create: (payload: CreateDocumentRequest) =>
    apiClient.post<DocumentRecord>(`${apiRoot}/document`, payload),
  update: (id: string, payload: UpdateDocumentRequest) =>
    apiClient.patch<DocumentRecord>(`${apiRoot}/document/${id}`, payload),
  completeApproval: (id: string, payload: DocumentApprovalRequest) =>
    apiClient.post<DocumentRecord>(`${apiRoot}/document/${id}/approval`, payload),
  uploadAttachments: (documentId: string, attachments: AttachmentUpload[]) =>
    apiClient.post<Attachment[]>(`${apiRoot}/document/${documentId}/attachment`, { attachments }),
  replaceAttachment: (attachmentId: string, attachment: AttachmentUpload) =>
    apiClient.put<Attachment>(`${apiRoot}/attachment/${attachmentId}`, { attachments: [attachment] }),
  deleteAttachment: (attachmentId: string) =>
    apiClient.delete<void>(`${apiRoot}/attachment/${attachmentId}`),
  getAttachmentVersions: (attachmentId: string) =>
    apiClient.get<Attachment[]>(`${apiRoot}/attachment/${attachmentId}/versions`),
  attachmentUrl,
  downloadAttachment,
};
