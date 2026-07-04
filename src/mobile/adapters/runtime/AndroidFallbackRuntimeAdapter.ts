/**
 * AndroidFallbackRuntimeAdapter
 *
 * Provides a safe, non-crashing implementation of the RuntimeAdapter
 * interface for environments where WebContainer is NOT available
 * (Android WebView via Capacitor, older browsers without
 * SharedArrayBuffer, etc.).
 *
 * Design principles:
 *   1. Never throw synchronously — always return a promise/result.
 *   2. Return clear "unsupported" messages so the UI can display them.
 *   3. File system is in-memory (Map-based) — AI-generated code is
 *      still editable and viewable, just not persisted to disk.
 *   4. Terminal is a stub that shows a warning message.
 *   5. Dev server / preview / package install are explicitly disabled.
 *   6. Prepare for future remote-runtime support: the interface matches
 *      what a RemoteRuntimeAdapter would provide, so swapping in a
 *      server-backed sandbox later is a drop-in change.
 *
 * What works on Android with this adapter:
 *   ✅ Chat with AI providers
 *   ✅ Code generation (AI writes code, shown in editor)
 *   ✅ File editing (in-memory)
 *   ✅ File tree navigation
 *   ✅ Settings / configuration
 *   ✅ Export / import chat
 *
 * What does NOT work (returns unsupported):
 *   ❌ Running shell commands
 *   ❌ Installing npm packages
 *   ❌ Starting a dev server
 *   ❌ Live preview iframe
 *   ❌ Git clone
 */

import type {
  RuntimeAdapter,
  PlatformInfo,
  RuntimeCapabilities,
  FileContent,
  Dirent,
  PathWatcherEvent,
  IPreview,
  CommandResult,
  ITerminalProcess,
  IRuntimeTerminal,
} from './RuntimeAdapter';
import { UnsupportedFeatureError } from './RuntimeAdapter';

// ---------------------------------------------------------------------------
// In-memory file system
// ---------------------------------------------------------------------------

class InMemoryFileSystem {
  private files = new Map<string, string>();
  private watchers = new Map<string, (event: PathWatcherEvent) => void>();

  async readFile(path: string): Promise<FileContent> {
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
    // In-memory fs doesn't need real directories, but we notify watchers
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

  /** Get all files (for debugging / export) */
  getAllFiles(): Map<string, string> {
    return new Map(this.files);
  }
}

// ---------------------------------------------------------------------------
// Stub terminal process
// ---------------------------------------------------------------------------

class StubTerminalProcess implements ITerminalProcess {
  private outputController!: ReadableStreamDefaultController<string>;
  readonly output: ReadableStream<string>;
  readonly input: WritableStreamDefaultWriter<string>;
  private alive = true;

  constructor(terminal: IRuntimeTerminal) {
    const self = this;

    this.output = new ReadableStream<string>({
      start(controller) {
        self.outputController = controller;
        controller.enqueue(
          '\x1b[33m⚠ WebContainer is not available on this device.\x1b[0m\r\n' +
            '\x1b[33mTerminal commands cannot be executed on Android.\x1b[0m\r\n' +
            '\x1b[90mYou can still chat with AI, generate code, and edit files.\x1b[0m\r\n' +
            '\x1b[90mA remote runtime may be available in a future update.\x1b[0m\r\n\r\n',
        );
      },
    });

    // Echo input to terminal so the user sees what they type
    const inputStream = new WritableStream<string>({
      write(data) {
        if (self.alive) {
          terminal.write(data);
        }
      },
    });
    this.input = inputStream.getWriter();

    // Pipe output to terminal
    this.output
      .pipeTo(
        new WritableStream<string>({
          write(data) {
            terminal.write(data);
          },
        }),
      )
      .catch(() => {
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

// ---------------------------------------------------------------------------
// AndroidFallbackRuntimeAdapter
// ---------------------------------------------------------------------------

export class AndroidFallbackRuntimeAdapter implements RuntimeAdapter {
  private fs = new InMemoryFileSystem();
  private booted = false;
  private serverReadyCallbacks: ((port: number, url: string) => void)[] = [];
  private portCallbacks: ((port: number, type: 'open' | 'close', url: string) => void)[] = [];
  private previewCallbacks: ((message: any) => void)[] = [];
  private previews: IPreview[] = [];

  // -- Platform identification ------------------------------------------------

  getPlatformInfo(): PlatformInfo {
    return {
      type: 'android',
      isMobile: true,
      isAndroid: true,
      isWebContainerSupported: false,
      isElectron: false,
    };
  }

  getCapabilities(): RuntimeCapabilities {
    return {
      fileSystem: true, // in-memory only
      terminal: false,
      commandExecution: false,
      packageInstall: false,
      devServer: false,
      preview: false,
      gitClone: false,
      persistentFileSystem: false, // in-memory, lost on reload
    };
  }

  // -- Lifecycle --------------------------------------------------------------

  async boot(): Promise<void> {
    this.booted = true;
    console.log('[AndroidFallbackRuntimeAdapter] Booted in fallback mode (no WebContainer)');
    console.log(
      '[AndroidFallbackRuntimeAdapter] Capabilities: fileSystem=memory, terminal=off, ' +
        'devServer=off, preview=off. Chat and code generation are fully functional.',
    );
  }

  isReady(): boolean {
    return this.booted;
  }

  async shutdown(): Promise<void> {
    this.booted = false;
  }

  // -- File system (in-memory, fully functional) ------------------------------

  async readFile(path: string): Promise<FileContent> {
    return this.fs.readFile(path);
  }

  async writeFile(path: string, content: string | Uint8Array): Promise<void> {
    return this.fs.writeFile(path, content);
  }

  async mkdir(path: string, recursive?: boolean): Promise<void> {
    return this.fs.mkdir(path, recursive);
  }

  async readdir(path: string): Promise<Dirent[]> {
    return this.fs.readdir(path);
  }

  async rm(path: string, recursive?: boolean): Promise<void> {
    return this.fs.rm(path, recursive);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    return this.fs.rename(oldPath, newPath);
  }

  async watch(path: string, callback: (event: PathWatcherEvent) => void): Promise<() => void> {
    return this.fs.watch(path, callback);
  }

  // -- Terminal / commands (stub — returns unsupported) -----------------------

  async spawnShell(terminal: IRuntimeTerminal): Promise<ITerminalProcess> {
    // We return a stub process rather than throwing — this lets the
    // terminal UI render with a visible warning instead of crashing.
    return new StubTerminalProcess(terminal);
  }

  async executeCommand(_command: string): Promise<CommandResult> {
    return {
      output:
        'Command execution is not available on this device.\n' +
        'A remote runtime may be available in a future update.\n',
      exitCode: 1,
    };
  }

  async installDependencies(_options?: {
    packageManager?: 'npm' | 'pnpm' | 'yarn';
    cwd?: string;
  }): Promise<CommandResult> {
    return {
      output:
        'Package installation is not available on this device.\n' +
        'Dependencies cannot be installed without a runtime.\n' +
        'A remote runtime may be available in a future update.\n',
      exitCode: 1,
    };
  }

  // -- Dev server / preview (stub — returns unsupported) ----------------------

  async startDevServer(_command: string): Promise<CommandResult> {
    return {
      output:
        'Dev server is not available on this device.\n' +
        'WebContainer is required to run a development server.\n' +
        'A remote runtime may be available in a future update.\n',
      exitCode: 1,
    };
  }

  onServerReady(_callback: (port: number, url: string) => void): void {
    // No-op — server-ready events will never fire on Android.
    // We accept the callback to maintain interface compatibility.
  }

  onPortEvent(_callback: (port: number, type: 'open' | 'close', url: string) => void): void {
    // No-op
  }

  getPreviewUrl(_port: number): string | null {
    return null;
  }

  getPreviews(): IPreview[] {
    return [];
  }

  // -- Preview inspector (no-op) ----------------------------------------------

  onPreviewMessage(_callback: (message: any) => void): void {
    // No-op
  }

  async setPreviewScript(_script: string): Promise<void> {
    // No-op — no WebContainer to inject into
  }

  // -- Workdir ----------------------------------------------------------------

  get workdir(): string {
    // Return a virtual workdir name that matches what WebContainer uses.
    // This lets file paths be consistent across adapters.
    return 'workspace';
  }
}
