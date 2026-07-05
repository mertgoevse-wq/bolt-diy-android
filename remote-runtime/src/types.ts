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
  commandProfile: CommandProfile;
}

export interface CommandRunResponse {
  commandId: string;
  commandProfile: CommandProfile;
  workspaceId: string;
  status: CommandStatus;
  startedAt: string;
  endedAt?: string;
  exitCode?: number | null;
  signal?: string | null;
  error?: string;
}

export type CommandProfile =
  | 'npm install'
  | 'npm run dev'
  | 'npm run build'
  | 'pnpm install'
  | 'pnpm run dev'
  | 'pnpm run build';

export type CommandStatus = 'running' | 'exited' | 'stopped' | 'error' | 'timed-out';

export interface EventMessage {
  type: 'status' | 'stdout' | 'stderr' | 'exit';
  timestamp: string;
  payload: any;
}
