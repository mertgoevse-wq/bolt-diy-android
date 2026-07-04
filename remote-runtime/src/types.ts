export interface HealthResponse {
  ok: boolean;
  service: string;
  version: string;
}

export interface WorkspaceResponse {
  workspaceId: string;
}

export interface FileItem {
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

export interface WorkspaceFilesResponse {
  files: FileItem[];
}

export interface SyncFilesRequest {
  files: Record<string, string>; // path -> content
}

export interface CommandRunRequest {
  command: string;
  args?: string[];
}

export interface CommandRunResponse {
  commandId: string;
}

export interface EventMessage {
  type: 'status' | 'stdout' | 'stderr' | 'exit';
  timestamp: string;
  payload: any;
}
