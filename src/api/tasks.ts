import { apiClient } from './client';
import type { TaskActionRequest, TaskActionResponse, TaskOperationResponse, TaskSearchRequest, TaskSearchResponse, TaskSummary } from '../types/task';

const apiRoot = '/api/core/v1';
export const taskCountersChangedEvent = 'corelia-web:task-counters-changed';

export const tasksApi = {
  summary: () => apiClient.get<TaskSummary>(`${apiRoot}/tasks/summary`),
  search: (filters: TaskSearchRequest) =>
    apiClient.post<TaskSearchResponse>(`${apiRoot}/tasks/search`, filters),
  start: (id: string) => apiClient.post<TaskOperationResponse>(`${apiRoot}/tasks/${encodeURIComponent(id)}/start`, {}),
  action: (id: string, payload: TaskActionRequest) =>
    apiClient.post<TaskActionResponse>(`${apiRoot}/tasks/${encodeURIComponent(id)}/action`, payload),
};
