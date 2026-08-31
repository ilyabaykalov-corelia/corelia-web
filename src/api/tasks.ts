import { apiClient } from './client';
import type { TaskActionRequest, TaskActionResponse, TaskOperationResponse, TaskSearchRequest, TaskSearchResponse, TaskSummary } from '../types/task';

const apiRoot = '/api/v1';
export const taskCountersChangedEvent = 'sber-npf:task-counters-changed';

export const tasksApi = {
  summary: () => apiClient.get<TaskSummary>(`${apiRoot}/task/summary`),
  search: (filters: TaskSearchRequest) =>
    apiClient.post<TaskSearchResponse>(`${apiRoot}/task/search`, filters),
  start: (id: string) => apiClient.post<TaskOperationResponse>(`${apiRoot}/task/${encodeURIComponent(id)}/start`, {}),
  action: (id: string, payload: TaskActionRequest) =>
    apiClient.post<TaskActionResponse>(`${apiRoot}/task/${encodeURIComponent(id)}/action`, payload),
};
