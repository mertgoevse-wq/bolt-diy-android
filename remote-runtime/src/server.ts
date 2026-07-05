import express from 'express';
import cors from 'cors';
import http from 'http';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';
import dotenv from 'dotenv';

import { requireAuth, validateToken } from './auth.js';
import { createWorkspace, getWorkspacePath, isValidWorkspaceId } from './workspaces.js';
import {
  getWorkspaceFileMetadata,
  getWorkspaceFilesWithContent,
  listFilesRecursively,
  readWorkspaceTextFile,
  writeWorkspaceFiles,
} from './files.js';
import {
  getCommand,
  isCommandProfile,
  listCommandProfiles,
  startCommand,
  stopCommand,
  type CommandEvent,
} from './commands.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const workspaceSockets = new Map<string, Set<WebSocket>>();

const PORT = parseInt(process.env.REMOTE_RUNTIME_PORT || '8787', 10);
const HOST = process.env.REMOTE_RUNTIME_HOST || '127.0.0.1';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

function jsonError(res: express.Response, status: number, error: string) {
  res.status(status).json({ ok: false, error });
}

function ensureWorkspaceExists(id: string) {
  const workspacePath = getWorkspacePath(id);

  return fs.existsSync(workspacePath);
}

function broadcastWorkspaceEvent(workspaceId: string, event: CommandEvent) {
  const sockets = workspaceSockets.get(workspaceId);

  if (!sockets) {
    return;
  }

  const payload = JSON.stringify(event);

  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  }
}

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'bolt-diy-android-remote-runtime',
    version: '1.0.0',
  });
});

/**
 * POST /workspace
 */
app.post('/workspace', requireAuth, (req, res) => {
  try {
    const workspaceId = 'ws_' + Math.random().toString(36).substring(2, 11);
    createWorkspace(workspaceId);
    console.log(`[RemoteRuntime] Created workspace: ${workspaceId}`);
    res.status(201).json({ workspaceId, createdAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('[RemoteRuntime] Error creating workspace', error);
    jsonError(res, 500, error.message || 'Internal server error');
  }
});

/**
 * GET /workspace/:id/files/content?path=...
 */
app.get('/workspace/:id/files/content', requireAuth, (req, res) => {
  const { id } = req.params;
  const filePath = typeof req.query.path === 'string' ? req.query.path : '';

  if (!isValidWorkspaceId(id)) {
    jsonError(res, 400, 'Invalid workspace ID format.');
    return;
  }

  if (!ensureWorkspaceExists(id)) {
    jsonError(res, 404, 'Workspace not found.');
    return;
  }

  if (!filePath) {
    jsonError(res, 400, 'Missing required query parameter: path.');
    return;
  }

  try {
    res.status(200).json(readWorkspaceTextFile(id, filePath));
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      jsonError(res, 403, error.message);
    } else if (error.message.includes('not text-safe')) {
      jsonError(res, 415, 'Only text-safe files can be read by the Remote Runtime file API.');
    } else {
      console.error(`[RemoteRuntime] Error reading file for ${id}`, error);
      jsonError(res, 500, error.message || 'Internal server error');
    }
  }
});

/**
 * GET /workspace/:id/files
 */
app.get('/workspace/:id/files', requireAuth, (req, res) => {
  const { id } = req.params;
  const includeContent = req.query.includeContent === 'true';

  if (!isValidWorkspaceId(id)) {
    jsonError(res, 400, 'Invalid workspace ID format.');
    return;
  }

  if (!ensureWorkspaceExists(id)) {
    jsonError(res, 404, 'Workspace not found.');
    return;
  }

  try {
    const files = includeContent ? getWorkspaceFilesWithContent(id) : listFilesRecursively(id);
    res.status(200).json({ files });
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      jsonError(res, 403, error.message);
    } else {
      console.error(`[RemoteRuntime] Error listing files for ${id}`, error);
      jsonError(res, 500, error.message || 'Internal server error');
    }
  }
});

/**
 * PUT /workspace/:id/files
 */
app.put('/workspace/:id/files', requireAuth, (req, res) => {
  const { id } = req.params;
  const { files } = req.body;

  if (!isValidWorkspaceId(id)) {
    jsonError(res, 400, 'Invalid workspace ID format.');
    return;
  }

  if (!ensureWorkspaceExists(id)) {
    jsonError(res, 404, 'Workspace not found.');
    return;
  }

  if (!files || typeof files !== 'object') {
    jsonError(res, 400, 'Invalid payload: "files" object is required.');
    return;
  }

  if (Array.isArray(files)) {
    jsonError(res, 400, 'Invalid payload: "files" must be an object keyed by relative path.');
    return;
  }

  try {
    writeWorkspaceFiles(id, files);
    const filePaths = Object.keys(files);
    res.status(200).json({
      ok: true,
      writtenFileCount: filePaths.length,
      files: getWorkspaceFileMetadata(id, filePaths),
    });
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      jsonError(res, 403, error.message);
    } else if (error.message.includes('Invalid payload') || error.message.includes('Invalid file path')) {
      jsonError(res, 400, error.message);
    } else {
      console.error(`[RemoteRuntime] Error writing files for ${id}`, error);
      jsonError(res, 500, error.message || 'Internal server error');
    }
  }
});

/**
 * GET /workspace/:id/preview (Stub)
 */
app.get('/workspace/:id/preview', requireAuth, (req, res) => {
  const { id } = req.params;

  if (!isValidWorkspaceId(id)) {
    jsonError(res, 400, 'Invalid workspace ID format.');
    return;
  }

  if (!ensureWorkspaceExists(id)) {
    jsonError(res, 404, 'Workspace not found.');
    return;
  }

  res.status(200).send(`
    <html>
      <head>
        <title>Remote Preview (Stub)</title>
        <style>
          body { font-family: sans-serif; background: #0b0b0f; color: #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #181824; padding: 2rem; border-radius: 12px; border: 1px solid #2e2e3f; max-width: 400px; text-align: center; }
          h2 { color: #a855f7; margin-top: 0; }
          p { font-size: 0.9rem; color: #94a3b8; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Remote Live Preview</h2>
          <p>Workspace ID: <strong>${id}</strong></p>
          <p>This is a safe preview tunnel placeholder. WebContainer operations and remote server dev ports will render here in a future release.</p>
        </div>
      </body>
    </html>
  `);
});

/**
 * POST /workspace/:id/commands
 */
app.post('/workspace/:id/commands', requireAuth, (req, res) => {
  const { id } = req.params;
  const { commandProfile } = req.body ?? {};

  if (!isValidWorkspaceId(id)) {
    jsonError(res, 400, 'Invalid workspace ID format.');
    return;
  }

  if (!ensureWorkspaceExists(id)) {
    jsonError(res, 404, 'Workspace not found.');
    return;
  }

  if (!isCommandProfile(commandProfile)) {
    jsonError(
      res,
      400,
      `Invalid commandProfile. Allowed profiles: ${listCommandProfiles().join(', ')}.`,
    );
    return;
  }

  try {
    const command = startCommand(id, getWorkspacePath(id), commandProfile, (event) => {
      broadcastWorkspaceEvent(id, event);
    });
    res.status(202).json(command);
  } catch (error: any) {
    console.error(`[RemoteRuntime] Error starting command for ${id}`, error);
    jsonError(res, 500, error.message || 'Internal server error');
  }
});

/**
 * GET /workspace/:id/commands/:commandId
 */
app.get('/workspace/:id/commands/:commandId', requireAuth, (req, res) => {
  const { id, commandId } = req.params;

  if (!isValidWorkspaceId(id)) {
    jsonError(res, 400, 'Invalid workspace ID format.');
    return;
  }

  if (!ensureWorkspaceExists(id)) {
    jsonError(res, 404, 'Workspace not found.');
    return;
  }

  const command = getCommand(commandId);

  if (!command || command.workspaceId !== id) {
    jsonError(res, 404, 'Command not found.');
    return;
  }

  res.status(200).json(command);
});

/**
 * POST /workspace/:id/commands/:commandId/stop
 */
app.post('/workspace/:id/commands/:commandId/stop', requireAuth, (req, res) => {
  const { id, commandId } = req.params;

  if (!isValidWorkspaceId(id)) {
    jsonError(res, 400, 'Invalid workspace ID format.');
    return;
  }

  if (!ensureWorkspaceExists(id)) {
    jsonError(res, 404, 'Workspace not found.');
    return;
  }

  const command = getCommand(commandId);

  if (!command || command.workspaceId !== id) {
    jsonError(res, 404, 'Command not found.');
    return;
  }

  const stoppedCommand = stopCommand(commandId, (event) => {
    broadcastWorkspaceEvent(id, event);
  });

  res.status(200).json(stoppedCommand);
});

/**
 * WebSocket upgrade validation & attachment
 */
server.on('upgrade', (request, socket, head) => {
  const parsedUrl = url.parse(request.url || '', true);
  const pathname = parsedUrl.pathname || '';

  // Match /workspace/:id/events
  const match = pathname.match(/^\/workspace\/([a-zA-Z0-9_\-]+)\/events$/);

  if (!match) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  const workspaceId = match[1];
  const queryToken = parsedUrl.query.token as string | undefined;

  if (!isValidWorkspaceId(workspaceId) || !ensureWorkspaceExists(workspaceId)) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  // Retrieve token from query params or sec-websocket-protocol
  let token = queryToken;
  if (!token) {
    const protocols = request.headers['sec-websocket-protocol'];
    if (protocols) {
      // Sometimes clients pass token as protocol
      token = protocols.split(',')[0].trim();
    }
  }

  if (!validateToken(token)) {
    console.warn(`[RemoteRuntime] WebSocket upgrade rejected for workspace ${workspaceId}: Invalid token.`);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request, workspaceId);
  });
});

/**
 * WebSocket Connection Handler
 */
wss.on('connection', (ws: WebSocket, request: http.IncomingMessage, workspaceId: string) => {
  console.log(`[RemoteRuntime] Client connected to events channel for workspace: ${workspaceId}`);
  const sockets = workspaceSockets.get(workspaceId) ?? new Set<WebSocket>();
  sockets.add(ws);
  workspaceSockets.set(workspaceId, sockets);

  // Send status connection event
  ws.send(JSON.stringify({
    type: 'status',
    timestamp: new Date().toISOString(),
    payload: { status: 'connected', workspaceId },
  }));

  ws.on('message', (message) => {
    console.log(`[RemoteRuntime] Ignored WebSocket input in workspace ${workspaceId}: ${message}`);
    ws.send(JSON.stringify({
      type: 'status',
      timestamp: new Date().toISOString(),
      payload: { status: 'input_ignored', output: 'Free-form terminal input is disabled. Use command profiles only.\n' },
    }));
  });

  ws.on('close', () => {
    const currentSockets = workspaceSockets.get(workspaceId);
    currentSockets?.delete(ws);

    if (currentSockets?.size === 0) {
      workspaceSockets.delete(workspaceId);
    }

    console.log(`[RemoteRuntime] Connection closed for workspace: ${workspaceId}`);
  });
});

/**
 * Start Server
 */
server.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(` bolt.diy Android — Remote Runtime Server Scaffold  `);
  console.log(`====================================================`);
  console.log(` Running on: http://${HOST}:${PORT} `);
  console.log(` Workspaces: ${getWorkspacePath('example').replace('example', '')} `);
  console.log(` Mode: Sandboxed (Allowlisted command profiles only) `);
  console.log(`====================================================`);
});
