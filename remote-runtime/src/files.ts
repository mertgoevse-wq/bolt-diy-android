import path from 'path';
import fs from 'fs';
import { getWorkspacePath } from './workspaces.js';
import type { FileItem } from './types.js';

const TEXT_CONTROL_CHARACTER_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

/**
 * Safely resolves a file path within a workspace, preventing traversal.
 */
export function resolveSafeFilePath(workspaceId: string, relativeFilePath: string): string {
  const wsPath = getWorkspacePath(workspaceId);
  const normalizedRelativePath = relativeFilePath.replace(/\\/g, '/');

  if (
    !normalizedRelativePath ||
    normalizedRelativePath.includes('\0') ||
    path.isAbsolute(normalizedRelativePath)
  ) {
    throw new Error('Invalid file path.');
  }

  const resolved = path.resolve(wsPath, normalizedRelativePath);
  const workspaceRoot = wsPath.endsWith(path.sep) ? wsPath : `${wsPath}${path.sep}`;

  if (resolved !== wsPath && !resolved.startsWith(workspaceRoot)) {
    throw new Error('Access denied: Path traversal detected.');
  }

  return resolved;
}

export function isTextSafeContent(content: unknown): content is string {
  return typeof content === 'string' && !TEXT_CONTROL_CHARACTER_REGEX.test(content);
}

/**
 * Lists all files inside a workspace recursively.
 */
export function listFilesRecursively(workspaceId: string, dirPath: string = ''): FileItem[] {
  const targetDir = dirPath ? resolveSafeFilePath(workspaceId, dirPath) : getWorkspacePath(workspaceId);

  if (!fs.existsSync(targetDir)) {
    return [];
  }

  const items = fs.readdirSync(targetDir, { withFileTypes: true });
  const result: FileItem[] = [];

  for (const item of items) {
    const relativeItemPath = path.join(dirPath, item.name).replace(/\\/g, '/');
    
    if (item.isDirectory()) {
      const stats = fs.statSync(path.join(targetDir, item.name));
      result.push({
        path: relativeItemPath,
        type: 'directory',
        modifiedAt: stats.mtime.toISOString(),
      });
      // Recurse
      result.push(...listFilesRecursively(workspaceId, relativeItemPath));
    } else {
      const stats = fs.statSync(path.join(targetDir, item.name));
      result.push({
        path: relativeItemPath,
        type: 'file',
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
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
    if (!isTextSafeContent(content)) {
      throw new Error(`Invalid payload: "${relativePath}" must contain text-safe string content.`);
    }

    const resolvedPath = resolveSafeFilePath(workspaceId, relativePath);
    const parentDir = path.dirname(resolvedPath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(resolvedPath, content, 'utf8');
  }
}

export function readWorkspaceTextFile(workspaceId: string, filePath: string): { path: string; content: string; size: number; modifiedAt: string } {
  const resolvedPath = resolveSafeFilePath(workspaceId, filePath);
  const stats = fs.statSync(resolvedPath);

  if (!stats.isFile()) {
    throw new Error('Requested path is not a file.');
  }

  const content = fs.readFileSync(resolvedPath, 'utf8');

  if (!isTextSafeContent(content)) {
    throw new Error('Requested file is not text-safe.');
  }

  return {
    path: filePath.replace(/\\/g, '/'),
    content,
    size: stats.size,
    modifiedAt: stats.mtime.toISOString(),
  };
}

/**
 * Recursively reads all files in a workspace and includes text-safe contents.
 */
export function getWorkspaceFilesWithContent(workspaceId: string): FileItem[] {
  const files = listFilesRecursively(workspaceId);
  const result: FileItem[] = [];

  for (const file of files) {
    if (file.type !== 'file') {
      result.push(file);
      continue;
    }

    try {
      const readFile = readWorkspaceTextFile(workspaceId, file.path);
      result.push({
        ...file,
        content: readFile.content,
        isBinary: false,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('not text-safe')) {
        result.push({
          ...file,
          isBinary: true,
        });
      } else {
        console.error(`[RemoteRuntime] Error reading file ${file.path}:`, err);
        result.push(file);
      }
    }
  }

  return result;
}

export function getWorkspaceFileMetadata(workspaceId: string, filePaths: string[]): FileItem[] {
  const result: FileItem[] = [];

  for (const filePath of filePaths) {
    const normalizedPath = filePath.replace(/\\/g, '/');

    try {
      const resolvedPath = resolveSafeFilePath(workspaceId, normalizedPath);
      const stats = fs.statSync(resolvedPath);

      if (!stats.isFile()) {
        continue;
      }

      result.push({
        path: normalizedPath,
        type: 'file',
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      });
    } catch (err) {
      console.error(`[RemoteRuntime] Error collecting metadata for ${normalizedPath}:`, err);
    }
  }

  return result;
}
