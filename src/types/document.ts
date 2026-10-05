export type ApprovalStatus = string;
export type ApprovalDecision = string;
export type DocumentWorkflowActionCode = string;
export type DocumentStatus = string;
export type AttributeValue = string | number | boolean | null;
export type DocumentAttributes = Record<string, AttributeValue>;
/** Ограниченный UI-профиль schema атрибута, поставляемый server-side configuration. */
export interface AttributeDefinition {
  type: 'string' | 'integer' | 'number' | 'boolean';
  title?: string; description?: string; format?: 'date';
  minLength?: number; maxLength?: number; pattern?: string;
  min?: number; max?: number; enum?: AttributeValue[];
}
export type DocumentActionTone = 'success' | 'warning' | 'error';

export interface DocumentWorkflowAction {
  code: DocumentWorkflowActionCode;
  status?: ApprovalDecision;
  label: string;
  tone: DocumentActionTone;
  result?: Record<string, unknown>;
}

export interface DocumentFormMetadata {
  fields: string[];
  label?: string;
  sections?: unknown[];
  tabs?: unknown[];
}
export interface DocumentTableColumn { field: string; label?: string }

/**
 * Описание типа из gateway catalog. Клиент использует metadata для rendering,
 * но server остаётся владельцем validation, access checks и transitions.
 */
export interface DocumentType {
  id: string;
  name: string;
  schema: { type: 'object'; properties: Record<string, AttributeDefinition>; required?: string[] };
  ui: {
    fields: string[]; columns: Array<string | DocumentTableColumn>; searchFields: string[]; sortFields: string[];
    dateField?: string; masks?: Record<string, string>; initialValues?: Record<string, AttributeValue>;
    createForm?: DocumentFormMetadata; viewCard?: DocumentFormMetadata; editCard?: DocumentFormMetadata;
    sections?: unknown[]; tabs?: unknown[]; indexHints?: string[];
  };
  statuses: Record<string, string>;
  initialAttachmentRequired: boolean;
  attachments: { enabled: boolean; initialRequired: boolean; maxCount: number; maxSizeBytes: number; allowedExtensions: string[]; allowedMimeTypes: string[] };
}

/** Возвращает поля специальной формы либо общий fallback `ui.fields`. */
export const formFields = (definition: DocumentType, form: 'createForm' | 'viewCard' | 'editCard') => definition.ui[form]?.fields ?? definition.ui.fields;
export const columnField = (column: string | DocumentTableColumn) => typeof column === 'string' ? column : column.field;
export const columnLabel = (definition: DocumentType | undefined, column: string | DocumentTableColumn) =>
  typeof column === 'object' && column.label ? column.label : definition?.schema.properties[columnField(column)]?.title || columnField(column);

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
export type DocumentHistoryAction = 'DOCUMENT_CREATED' | 'ATTRIBUTES_CHANGED' | 'ATTACHMENT_ADDED' | 'ATTACHMENT_REPLACED' | 'ATTACHMENT_DELETED';
export interface DocumentHistoryEntry {
  id: string;
  timestamp: string;
  userLogin: string;
  action: DocumentHistoryAction;
  documentVersion?: number;
  changes?: { field: string; fieldLabel: string; oldValue?: AttributeValue; newValue?: AttributeValue }[];
  attachment?: { attachmentId: string; oldFileName?: string; oldVersion?: number; newFileName?: string; newVersion?: number };
}

/** Актуальный или исторический снимок, нормализованный из public API gateway. */
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

/** PATCH-контракт с optimistic-locking metadata, полученной при чтении карточки. */
export interface UpdateDocumentRequest extends CreateDocumentRequest {
  expectedVersion?: number;
  changeToken?: string;
  requestId?: string;
}

export interface DocumentApprovalRequest {
  actionCode?: DocumentWorkflowActionCode;
  status?: ApprovalDecision;
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
