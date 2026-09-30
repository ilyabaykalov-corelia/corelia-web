import { apiClient } from './client';
import type { WorkflowDefinitionsResponse } from '../types/workflow';

const apiRoot = '/api/core/v1';

export const workflowsApi = {
  list: () => apiClient.get<WorkflowDefinitionsResponse>(`${apiRoot}/admin/workflows`),
};
