/** Опубликованное либо draft workflow definition без Flowable-specific DTO. */
export interface WorkflowDefinition {
  name: string;
  key: string;
  publishedVersion: number;
  draft: boolean;
  status: string;
  lastPublishedAt: string | null;
  publishedBy: string | null;
  activeInstances: number;
  definitionId: string | null;
  deploymentId: string | null;
}

export interface WorkflowDefinitionsResponse {
  editEnabled: boolean;
  items: WorkflowDefinition[];
}

export interface WorkflowDraft {
  key: string;
  name: string;
  bpmnXml: string;
  updatedAt: string;
  updatedBy: string;
}

export interface WorkflowView {
  key: string;
  name: string;
  bpmnXml: string;
  readOnly: boolean;
  publishedVersion: number;
  definitionId: string | null;
  deploymentId: string | null;
}

export interface WorkflowActivityRuntime { activityId: string; activeInstances: number; }
export interface WorkflowRuntime { activeInstances: number; activities: WorkflowActivityRuntime[]; }
export interface WorkflowActiveDocument {
  id: string;
  typeCode: string;
  typeName: string;
  status: string;
  statusLabel: string;
  createdAt: string | null;
}
export interface WorkflowActiveDocumentsResponse { items: WorkflowActiveDocument[]; total: number; }

export interface WorkflowAuditEvent { event: string; at: string; by: string; }
export interface WorkflowAuditResponse { items: WorkflowAuditEvent[]; }
export interface WorkflowValidationError { code: string; message: string; }
export interface WorkflowValidationResponse { valid: boolean; errors: WorkflowValidationError[]; }
export interface WorkflowPublishResponse extends WorkflowValidationResponse {
  published: boolean;
  key?: string;
  version?: number;
  publishedAt?: string;
  definitionId?: string;
  deploymentId?: string;
}
