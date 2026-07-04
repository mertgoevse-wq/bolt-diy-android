export interface HealthResponse {
  ok: boolean;
  service: string;
  version: string;
}

export interface WorkspaceResponse {
  workspaceId: string;
  createdAt: string;
}

export interface RemoteFileItem {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: string;
  content?: string;
  isBinary?: boolean;
}

export interface ListFilesResponse {
  files: RemoteFileItem[];
}

export interface SyncFilesResponse {
  ok: boolean;
  writtenFileCount: number;
  files: RemoteFileItem[];
}

export interface ReadFileResponse {
  path: string;
  content: string;
  size: number;
  modifiedAt: string;
}

/**
 * RemoteRuntimeClient
 *
 * Client SDK to communicate with the bolt.diy Android Remote Runtime server.
 * Handles server health status checks, workspace creation, files syncing,
 * and sets up stubs for WebSocket/command execution.
 */
export class RemoteRuntimeClient {
  private serverUrl: string;
  private token: string;
  private workspaceId: string;

  constructor(serverUrl: string, token: string = '', workspaceId: string = '') {
    // Normalize URL to remove trailing slash
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.token = token;
    this.workspaceId = workspaceId;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.serverUrl}${path}`, {
        ...init,
        headers: {
          ...this.getHeaders(),
          ...(init.headers ?? {}),
        },
      });
    } catch (error) {
      throw new Error(
        `Network failure contacting Remote Runtime at ${this.serverUrl}. Check that the server is reachable from this device.`,
      );
    }

    if (!response.ok) {
      const detail = await this.readErrorDetail(response);
      throw new Error(this.formatHttpError(response.status, detail));
    }

    return response.json() as Promise<T>;
  }

  private async readErrorDetail(response: Response): Promise<string | undefined> {
    try {
      const payload = await response.json() as { error?: string; message?: string };
      return payload.error ?? payload.message;
    } catch {
      return undefined;
    }
  }

  private formatHttpError(status: number, detail?: string): string {
    const suffix = detail ? ` ${detail}` : '';

    if (status === 401 || status === 403) {
      return `Remote Runtime authentication failed (${status}). Check the auth token.${suffix}`;
    }

    if (status === 404) {
      return `Remote Runtime endpoint or workspace was not found (404). Check the server URL and workspace ID.${suffix}`;
    }

    if (status >= 500) {
      return `Remote Runtime server error (${status}). Check the server logs.${suffix}`;
    }

    return `Remote Runtime request failed (${status}).${suffix}`;
  }

  /**
   * Health Check: GET /health
   */
  async checkHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health', { method: 'GET' });
  }

  /**
   * Health Check alias
   */
  async health(): Promise<HealthResponse> {
    return this.checkHealth();
  }

  /**
   * Workspace Creation: POST /workspace
   */
  async createWorkspace(template: string = 'node-clean'): Promise<WorkspaceResponse> {
    const data = await this.request<WorkspaceResponse>('/workspace', {
      method: 'POST',
      body: JSON.stringify({ template }),
    });

    this.workspaceId = data.workspaceId;
    return data;
  }

  /**
   * List Files: GET /workspace/:id/files
   */
  async listFiles(options: { includeContent?: boolean } = {}): Promise<ListFilesResponse> {
    if (!this.workspaceId) {
      throw new Error('Workspace ID is not set.');
    }

    const query = options.includeContent ? '?includeContent=true' : '';

    return this.request<ListFilesResponse>(`/workspace/${this.workspaceId}/files${query}`, { method: 'GET' });
  }

  /**
   * Sync Files: PUT /workspace/:id/files
   */
  async syncFiles(files: Record<string, string>): Promise<SyncFilesResponse> {
    if (!this.workspaceId) {
      throw new Error('Workspace ID is not set.');
    }

    return this.request<SyncFilesResponse>(`/workspace/${this.workspaceId}/files`, {
      method: 'PUT',
      body: JSON.stringify({ files }),
    });
  }

  /**
   * Write Single File: PUT /workspace/:id/files
   */
  async writeFile(filePath: string, content: string): Promise<SyncFilesResponse> {
    return this.syncFiles({ [filePath]: content });
  }

  /**
   * Read Single File: GET /workspace/:id/files/content?path=...
   */
  async readFile(filePath: string): Promise<ReadFileResponse> {
    if (!this.workspaceId) {
      throw new Error('Workspace ID is not set.');
    }

    return this.request<ReadFileResponse>(
      `/workspace/${this.workspaceId}/files/content?path=${encodeURIComponent(filePath)}`,
      { method: 'GET' },
    );
  }

  /**
   * Run Command (Stub): POST /workspace/:id/commands
   */
  async runCommand(command: string, args: string[] = []): Promise<{ commandId: string }> {
    if (!this.workspaceId) {
      throw new Error('Workspace ID is not set.');
    }

    console.log(`[RemoteRuntimeClient] Stub: runCommand "${command}" with args:`, args);
    
    // Command execution is scaffolded/stubbed for now
    return { commandId: 'cmd_mock_' + Math.random().toString(36).substring(2, 11) };
  }

  /**
   * Stop Command (Stub)
   */
  async stopCommand(commandId: string): Promise<void> {
    console.log(`[RemoteRuntimeClient] Stub: stopCommand "${commandId}"`);
  }

  /**
   * Get Preview URL (Stub): GET /workspace/:id/preview
   */
  async getPreviewUrl(): Promise<{ port: number; previewUrl: string }> {
    if (!this.workspaceId) {
      throw new Error('Workspace ID is not set.');
    }

    console.log(`[RemoteRuntimeClient] Stub: getPreviewUrl for workspace ${this.workspaceId}`);
    return { port: 5173, previewUrl: `${this.serverUrl}/workspace/${this.workspaceId}/preview` };
  }

  /**
   * WebSocket Connection (Stub): WS /workspace/:id/events
   */
  connectWebSocket(onMessage: (event: any) => void): WebSocket {
    if (!this.workspaceId) {
      throw new Error('Workspace ID is not set.');
    }

    const wsScheme = this.serverUrl.startsWith('https') ? 'wss' : 'ws';
    const cleanHost = this.serverUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsScheme}://${cleanHost}/workspace/${this.workspaceId}/events`;

    console.log(`[RemoteRuntimeClient] Connecting to WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessage(parsed);
      } catch (err) {
        console.error('[RemoteRuntimeClient] Error parsing WebSocket message:', err);
      }
    };

    return ws;
  }

  /**
   * Connect Events alias
   */
  connectEvents(onMessage: (event: any) => void): WebSocket {
    return this.connectWebSocket(onMessage);
  }
}
