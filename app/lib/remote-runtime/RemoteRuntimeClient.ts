export interface HealthResponse {
  status: string;
  version: string;
  docker: string;
}

export interface WorkspaceResponse {
  workspaceId: string;
  createdAt: string;
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

  /**
   * Health Check: GET /health
   */
  async checkHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.serverUrl}/health`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Health check failed with status: ${response.status}`);
    }

    return response.json() as Promise<HealthResponse>;
  }

  /**
   * Workspace Creation: POST /workspace
   */
  async createWorkspace(template: string = 'node-clean'): Promise<WorkspaceResponse> {
    const response = await fetch(`${this.serverUrl}/workspace`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ template }),
    });

    if (!response.ok) {
      throw new Error(`Workspace creation failed with status: ${response.status}`);
    }

    const data = await response.json() as WorkspaceResponse;
    this.workspaceId = data.workspaceId;
    return data;
  }

  /**
   * List Files: GET /workspace/:id/files
   */
  async listFiles(): Promise<any> {
    if (!this.workspaceId) {
      throw new Error('Workspace ID is not set.');
    }

    const response = await fetch(`${this.serverUrl}/workspace/${this.workspaceId}/files`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Listing remote files failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Sync Files: PUT /workspace/:id/files
   */
  async syncFiles(files: Record<string, string>): Promise<void> {
    if (!this.workspaceId) {
      throw new Error('Workspace ID is not set.');
    }

    const response = await fetch(`${this.serverUrl}/workspace/${this.workspaceId}/files`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ files }),
    });

    if (!response.ok) {
      throw new Error(`Files syncing failed: ${response.status}`);
    }
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
}
