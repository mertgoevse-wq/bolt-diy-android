/**
 * Android / Fallback Platform Adapter
 *
 * Provides a working implementation of the PlatformAdapter interface
 * for environments where WebContainer is NOT available (Android WebView,
 * older browsers, etc.).
 *
 * Key differences from WebContainer:
 *   - File system is in-memory (using a Map)
 *   - Terminal shell is a stub that echoes input and shows a warning
 *   - Preview is not available (no dev server can run)
 *   - All AI/chat features work normally
 *
 * This allows bolt.diy to run as a chat + code editor on Android,
 * with file management and AI code generation fully functional.
 */

import type {
  PlatformAdapter,
  PlatformInfo,
  IFileSystem,
  ITerminalProcess,
  IPreview,
  Dirent,
  PathWatcherEvent,
} from './types';
import type { ITerminal } from '~/types/terminal';

export class InMemoryFileSystem implements IFileSystem {
  private files = new Map<string, string>();
  private watchers = new Map<string, (event: PathWatcherEvent) => void>();

  async readFile(path: string): Promise<{ content: string; isBinary: boolean }> {
    const content = this.files.get(path);

    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }

    return { content, isBinary: false };
  }

  async writeFile(path: string, content: string | Uint8Array): Promise<void> {
    const str = typeof content === 'string' ? content : new TextDecoder().decode(content);
    this.files.set(path, str);
    this.notifyWatchers({ path, type: 'change' });
  }

  async mkdir(path: string, _recursive?: boolean): Promise<void> {
    // In-memory fs doesn't need real directories
    this.notifyWatchers({ path, type: 'add' });
  }

  async readdir(path: string): Promise<Dirent[]> {
    const results: Dirent[] = [];
    const prefix = path.endsWith('/') ? path : path + '/';

    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const relative = filePath.slice(prefix.length);

        if (!relative.includes('/')) {
          results.push({ name: relative, path: filePath, type: 'file', isBinary: false });
        } else {
          const dirName = relative.split('/')[0];
          if (!results.find((r) => r.name === dirName)) {
            results.push({ name: dirName, path: prefix + dirName, type: 'folder' });
          }
        }
      }
    }

    return results;
  }

  async rm(path: string, _recursive?: boolean): Promise<void> {
    // Remove exact match and all children
    for (const key of this.files.keys()) {
      if (key === path || key.startsWith(path + '/')) {
        this.files.delete(key);
      }
    }
    this.notifyWatchers({ path, type: 'remove' });
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const content = this.files.get(oldPath);

    if (content !== undefined) {
      this.files.set(newPath, content);
      this.files.delete(oldPath);
      this.notifyWatchers({ path: newPath, type: 'change' });
    }
  }

  async watch(path: string, callback: (event: PathWatcherEvent) => void): Promise<() => void> {
    this.watchers.set(path, callback);

    return () => {
      this.watchers.delete(path);
    };
  }

  private notifyWatchers(event: PathWatcherEvent): void {
    for (const [watchPath, callback] of this.watchers.entries()) {
      if (event.path.startsWith(watchPath)) {
        callback(event);
      }
    }
  }

  /** Get all files as a map (for compatibility with FilesStore) */
  getAllFiles(): Map<string, string> {
    return new Map(this.files);
  }
}

/**
 * Stub terminal process for Android — echoes input and shows a
 * "not available" message.
 */
class StubTerminalProcess implements ITerminalProcess {
  private outputController!: ReadableStreamDefaultController<string>;
  readonly output: ReadableStream<string>;
  readonly input: WritableStreamDefaultWriter<string>;
  private alive = true;

  constructor(terminal: ITerminal) {
    const self = this;

    this.output = new ReadableStream<string>({
      start(controller) {
        self.outputController = controller;
        controller.enqueue(
          '\x1b[33m⚠ WebContainer is not available on this device.\x1b[0m\r\n' +
            '\x1b[33mTerminal commands cannot be executed on Android.\x1b[0m\r\n' +
            '\x1b[90mYou can still chat with AI, generate code, and edit files.\x1b[0m\r\n\r\n',
        );
      },
    });

    // Create input stream that echoes to terminal
    const inputStream = new WritableStream<string>({
      write(data) {
        if (self.alive) {
          terminal.write(data);
        }
      },
    });

    this.input = inputStream.getWriter();

    // Pipe output to terminal
    this.output.pipeTo(
      new WritableStream<string>({
        write(data) {
          terminal.write(data);
        },
      }),
    ).catch(() => {
      // stream closed
    });
  }

  resize(_cols: number, _rows: number): void {
    // no-op
  }

  kill(): void {
    this.alive = false;
  }
}

export class AndroidAdapter implements PlatformAdapter {
  private fs = new InMemoryFileSystem();
  private ready = false;
  private serverReadyCallbacks: ((port: number, url: string) => void)[] = [];
  private portCallbacks: ((port: number, type: 'open' | 'close', url: string) => void)[] = [];
  private previewCallbacks: ((message: any) => void)[] = [];
  private previews: IPreview[] = [];

  getPlatformInfo(): PlatformInfo {
    return {
      type: 'android',
      isMobile: true,
      isAndroid: true,
      isWebContainerSupported: false,
      isElectron: false,
    };
  }

  async boot(): Promise<void> {
    this.ready = true;
    console.log('[AndroidAdapter] Booted in fallback mode (no WebContainer)');
  }

  isReady(): boolean {
    return this.ready;
  }

  getFileSystem(): IFileSystem {
    return this.fs;
  }

  async spawnShell(terminal: ITerminal): Promise<ITerminalProcess> {
    return new StubTerminalProcess(terminal);
  }

  async executeCommand(_command: string): Promise<{ output: string; exitCode: number }> {
    return {
      output: 'Command execution is not available on Android.\n',
      exitCode: 1,
    };
  }

  onServerReady(callback: (port: number, url: string) => void): void {
    this.serverReadyCallbacks.push(callback);
  }

  onPortEvent(callback: (port: number, type: 'open' | 'close', url: string) => void): void {
    this.portCallbacks.push(callback);
  }

  onPreviewMessage(callback: (message: any) => void): void {
    this.previewCallbacks.push(callback);
  }

  async setPreviewScript(_script: string): Promise<void> {
    // no-op — no WebContainer to inject into
  }

  getPreviews(): IPreview[] {
    return this.previews;
  }

  async shutdown(): Promise<void> {
    this.ready = false;
  }
}
