import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// workspaces directory located under remote-runtime/workspaces
export const WORKSPACES_DIR = path.resolve(__dirname, '../workspaces');

/**
 * Ensures workspaces directory exists.
 */
export function ensureWorkspacesDir() {
  if (!fs.existsSync(WORKSPACES_DIR)) {
    fs.mkdirSync(WORKSPACES_DIR, { recursive: true });
  }
}

/**
 * Validates workspace ID format to prevent any directory injection.
 */
export function isValidWorkspaceId(workspaceId: string): boolean {
  return /^[a-zA-Z0-9_\-]+$/.test(workspaceId);
}

/**
 * Safely resolves and normalizes a workspace path.
 * Throws an error if path traversal is attempted.
 */
export function getWorkspacePath(workspaceId: string): string {
  if (!isValidWorkspaceId(workspaceId)) {
    throw new Error('Invalid workspace ID format');
  }

  const workspacePath = path.resolve(WORKSPACES_DIR, workspaceId);

  // Check traversal
  if (!workspacePath.startsWith(WORKSPACES_DIR)) {
    throw new Error('Access denied: Path traversal detected.');
  }

  return workspacePath;
}

/**
 * Creates a workspace directory.
 */
export function createWorkspace(workspaceId: string): string {
  ensureWorkspacesDir();
  const wsPath = getWorkspacePath(workspaceId);
  if (!fs.existsSync(wsPath)) {
    fs.mkdirSync(wsPath, { recursive: true });
  }
  return wsPath;
}
