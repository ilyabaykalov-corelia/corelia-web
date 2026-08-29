import { apiClient } from './client';
import type { TaskSearchRequest, TaskSearchResponse, TaskSummary } from '../types/task';

const apiRoot = '/api/v1';

export const tasksApi = {
  summary: () => apiClient.get<TaskSummary>(`${apiRoot}/task/summary`),
  search: (filters: TaskSearchRequest) =>
    apiClient.post<TaskSearchResponse>(`${apiRoot}/task/search`, filters),
};
