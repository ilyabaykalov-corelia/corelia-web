export interface WorkflowDefinition {
  name: string;
  key: string;
  publishedVersion: number;
  draft: boolean;
  status: string;
  lastPublishedAt: string | null;
  publishedBy: string | null;
  activeInstances: number;
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

export interface WorkflowAuditEvent { event: string; at: string; by: string; }
export interface WorkflowAuditResponse { items: WorkflowAuditEvent[]; }
export interface WorkflowValidationError { code: string; message: string; }
export interface WorkflowValidationResponse { valid: boolean; errors: WorkflowValidationError[]; }
export interface WorkflowPublishResponse extends WorkflowValidationResponse {
  published: boolean;
  key?: string;
  version?: number;
  publishedAt?: string;
}
