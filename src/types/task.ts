export type TaskStatus = 'NEW' | 'ASSIGNED' | 'STARTED' | 'COMPLETED' | 'ABORTED';
export type TaskQueue = 'MY' | 'AVAILABLE';

export interface PlatformTask {
  id: string;
  type?: string;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  executorRole?: string | null;
  managerRole?: string | null;
  assignee?: string | null;
  assigneeName?: string | null;
  created?: number;
  dueDate?: number | null;
  attributes?: Record<string, unknown>;
}

export interface TaskSearchRequest {
  queue?: TaskQueue;
  query?: string;
  status?: TaskStatus | '';
}

export interface TaskSearchResponse {
  items: PlatformTask[];
  total: number;
}

export interface TaskOperationResponse {
  successIds?: string[];
  failedIds?: string[];
  message?: string;
}

export interface TaskSummary {
  my: number;
  available: number;
}

export interface TaskCountersDelta {
  my?: number;
  available?: number;
}
