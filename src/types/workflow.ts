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
  items: WorkflowDefinition[];
}
