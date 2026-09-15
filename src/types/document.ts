export type ApprovalStatus = 'CREATED' | 'IN_WORK' | 'ON_APPROVAL' | 'NEEDS_REVISION' | 'APPROVED' | 'REJECTED';
export type ApprovalDecision = Exclude<ApprovalStatus, 'CREATED'>;
export type DocumentWorkflowActionCode = string;
export type DocumentStatus = 'Создан' | 'В работе' | 'На согласовании' | 'Отправлено на доработку' | 'Согласован' | 'Отклонен';
export type DocumentActionTone = 'success' | 'warning' | 'error';

export interface DocumentWorkflowAction {
  code: DocumentWorkflowActionCode;
  status?: ApprovalDecision;
  label: string;
  tone: DocumentActionTone;
  result?: Record<string, unknown>;
}

export interface DocumentType {
  id: string;
  name: string;
}

export interface Attachment {
  id: string;
  logicalAttachmentId?: string;
  documentId: string;
  fileName: string;
  contentType: string;
  size: number;
  version?: number;
  current?: boolean;
  uploadedAt: string;
}

export interface DocumentVersion {
  version: number;
  createdBy: string;
  createdAt: string;
  closedAt?: string;
  current: boolean;
}

export interface DocumentRecord {
  version?: number;
  currentVersion?: number;
  changeToken?: string;
  versionCreatedBy?: string;
  versionCreatedAt?: string;
  id: string;
  documentTypeId: string;
  documentType: string;
  contractDate: string;
  contractNumber: string;
  snils: string;
  status: ApprovalStatus;
  documentStatus: DocumentStatus;
  createdBy?: string;
  createdAt?: string;
  processInstanceId?: string;
  workflow?: DocumentWorkflow;
  attachments: Attachment[];
}

export interface DocumentWorkflow {
  task?: Record<string, unknown> | null;
  availableActions?: DocumentWorkflowAction[];
  executor?: DocumentExecutor | null;
}

export interface DocumentExecutor {
  login?: string | null;
  name?: string | null;
  role?: string | null;
  roleLabel?: string | null;
  taskStatus?: 'NEW' | 'ASSIGNED' | 'STARTED' | 'COMPLETED' | 'ABORTED';
  taskTitle?: string;
}

export interface DocumentSearchRequest {
  documentTypeId?: string;
  query?: string;
  status?: ApprovalStatus | DocumentStatus | '';
  dateFrom?: string;
  dateTo?: string;
  offset?: number;
  limit?: number;
}

export interface DocumentSearchResponse {
  items: DocumentRecord[];
  total: number;
}

export interface DocumentTypesResponse {
  items: DocumentType[];
  total: number;
}

export interface CreateDocumentRequest {
  documentTypeId: string;
  contractDate: string;
  contractNumber: string;
  snils: string;
}

export interface UpdateDocumentRequest extends CreateDocumentRequest {
  expectedVersion?: number;
  changeToken?: string;
  requestId?: string;
}

export interface DocumentApprovalRequest {
  actionCode?: DocumentWorkflowActionCode;
  approvalStatus?: ApprovalDecision;
  parameters?: Record<string, unknown>;
}

export interface AttachmentUpload {
  fileName: string;
  contentType: string;
  size: number;
  contentBase64: string;
}

export interface CurrentUser {
  id: string;
  login: string;
  fullName: string;
}
