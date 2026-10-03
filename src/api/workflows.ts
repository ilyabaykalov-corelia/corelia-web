import { apiClient } from './client';
import type { WorkflowAuditResponse, WorkflowDefinitionsResponse, WorkflowPublishResponse, WorkflowValidationResponse } from '../types/workflow';
import type { WorkflowDraft } from '../types/workflow';

const apiRoot = '/api/core/v1';

/** Клиент workflow-admin endpoint; BPMN validation и deployment выполняет backend. */
export const workflowsApi = {
  list: () => apiClient.get<WorkflowDefinitionsResponse>(`${apiRoot}/admin/workflows`),
  create: (key: string, name: string) => apiClient.post<WorkflowDraft>(`${apiRoot}/admin/workflows`, { key, name }),
  draft: (key: string) => apiClient.get<WorkflowDraft>(`${apiRoot}/admin/workflows/${encodeURIComponent(key)}`),
  saveDraft: (key: string, name: string, bpmnXml: string) => apiClient.put<WorkflowDraft>(`${apiRoot}/admin/workflows/${encodeURIComponent(key)}/draft`, { name, bpmnXml }),
  validateDraft: (key: string) => apiClient.post<WorkflowValidationResponse>(`${apiRoot}/admin/workflows/${encodeURIComponent(key)}/validate`, {}),
  publishDraft: (key: string) => apiClient.post<WorkflowPublishResponse>(`${apiRoot}/admin/workflows/${encodeURIComponent(key)}/publish`, {}),
  importDraft: (key: string, name: string, bpmnXml: string) => apiClient.post<WorkflowDraft>(`${apiRoot}/admin/workflows/${encodeURIComponent(key)}/import`, { name, bpmnXml }),
  exportDraft: (key: string) => apiClient.get<Pick<WorkflowDraft, 'key' | 'name' | 'bpmnXml'>>(`${apiRoot}/admin/workflows/${encodeURIComponent(key)}/export`),
  audit: (key: string) => apiClient.get<WorkflowAuditResponse>(`${apiRoot}/admin/workflows/${encodeURIComponent(key)}/audit`),
};
