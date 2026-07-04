export interface HealthResponse {
  ok: boolean;
  service: string;
  version: string;
}

export interface WorkspaceResponse {
  workspaceId: string;
  createdAt: string;
}

export interface FileItem {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: string;
  content?: string;
  isBinary?: boolean;
}

export interface WorkspaceFilesResponse {
  files: FileItem[];
}

export interface SyncFilesRequest {
  files: Record<string, string>; // path -> content
}

export interface SyncFilesResponse {
  ok: boolean;
  writtenFileCount: number;
  files: FileItem[];
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
