export type ApprovalStatus = string;
export type ApprovalDecision = string;
export type DocumentWorkflowActionCode = string;
export type DocumentStatus = string;
export type AttributeValue = string | number | boolean | null;
export type DocumentAttributes = Record<string, AttributeValue>;
export interface AttributeDefinition {
  type: 'string' | 'integer' | 'number' | 'boolean';
  title?: string; description?: string; format?: 'date';
  minLength?: number; maxLength?: number; pattern?: string;
  minimum?: number; maximum?: number; enum?: AttributeValue[];
}
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
  schema: { type: 'object'; properties: Record<string, AttributeDefinition>; required?: string[] };
  ui: { fields: string[]; columns: string[]; searchFields: string[]; sortFields: string[]; dateField?: string };
  statuses: Record<string, string>;
  initialAttachmentRequired: boolean;
  attachments: { enabled: boolean; initialRequired: boolean; maxCount: number };
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
  attributes: DocumentAttributes;
  status: ApprovalStatus;
  documentStatus: DocumentStatus;
  createdBy?: string;
  createdAt?: string;
  processInstanceId?: string;
  workflowCompleted?: boolean;
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
  initialAttachment?: AttachmentUpload;
  requestId?: string;
  documentTypeId: string;
  attributes: DocumentAttributes;
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
