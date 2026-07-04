import path from 'path';
import fs from 'fs';
import { getWorkspacePath } from './workspaces.js';
import type { FileItem } from './types.js';

/**
 * Safely resolves a file path within a workspace, preventing traversal.
 */
export function resolveSafeFilePath(workspaceId: string, relativeFilePath: string): string {
  const wsPath = getWorkspacePath(workspaceId);
  const resolved = path.resolve(wsPath, relativeFilePath);

  if (!resolved.startsWith(wsPath)) {
    throw new Error('Access denied: Path traversal detected.');
  }

  return resolved;
}

/**
 * Lists all files inside a workspace recursively.
 */
export function listFilesRecursively(workspaceId: string, dirPath: string = ''): FileItem[] {
  const wsPath = getWorkspacePath(workspaceId);
  const targetDir = resolveSafeFilePath(workspaceId, dirPath);

  if (!fs.existsSync(targetDir)) {
    return [];
  }

  const items = fs.readdirSync(targetDir, { withFileTypes: true });
  const result: FileItem[] = [];

  for (const item of items) {
    const relativeItemPath = path.join(dirPath, item.name).replace(/\\/g, '/');
    
    if (item.isDirectory()) {
      result.push({
        path: relativeItemPath,
        type: 'directory',
      });
      // Recurse
      result.push(...listFilesRecursively(workspaceId, relativeItemPath));
    } else {
      const stats = fs.statSync(path.join(targetDir, item.name));
      result.push({
        path: relativeItemPath,
        type: 'file',
        size: stats.size,
      });
    }
  }

  return result;
}

/**
 * Writes a set of files to the workspace.
 */
export function writeWorkspaceFiles(workspaceId: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const resolvedPath = resolveSafeFilePath(workspaceId, relativePath);
    const parentDir = path.dirname(resolvedPath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(resolvedPath, content, 'utf8');
  }
}
