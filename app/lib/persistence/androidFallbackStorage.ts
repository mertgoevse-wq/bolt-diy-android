export interface AndroidFallbackSessionState {
  key: 'session';
  activeWorkspace: string;
  lastOpenedFile?: string;
  currentView?: string;
  updatedAt: string;
}

export interface AndroidFallbackWorkspaceState {
  key: 'workspace';
  files: Record<string, PersistedDirent>;
  deletedPaths: string[];
  updatedAt: string;
}

export interface PersistedDirent {
  type: 'file' | 'folder';
  content?: string;
  isBinary?: boolean;
  isLocked?: boolean;
  lockedByFolder?: string;
}

interface AndroidFallbackState {
  workspace: AndroidFallbackWorkspaceState;
  session: AndroidFallbackSessionState;
}

const DB_NAME = 'bolt-android-fallback';
const DB_VERSION = 1;
const WORKSPACE_STORE = 'workspace';
const SESSION_STORE = 'session';

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function createDefaultWorkspaceState(): AndroidFallbackWorkspaceState {
  return {
    key: 'workspace',
    files: {},
    deletedPaths: [],
    updatedAt: new Date().toISOString(),
  };
}

function createDefaultSessionState(): AndroidFallbackSessionState {
  return {
    key: 'session',
    activeWorkspace: 'default',
    updatedAt: new Date().toISOString(),
  };
}

function openDb(): Promise<IDBDatabase | undefined> {
  if (!isIndexedDBAvailable()) {
    return Promise.resolve(undefined);
  }

  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(WORKSPACE_STORE)) {
        db.createObjectStore(WORKSPACE_STORE, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
  });
}

async function getWorkspaceState(): Promise<AndroidFallbackWorkspaceState> {
  const db = await openDb();

  if (!db) {
    return createDefaultWorkspaceState();
  }

  return new Promise((resolve) => {
    const transaction = db.transaction(WORKSPACE_STORE, 'readonly');
    const store = transaction.objectStore(WORKSPACE_STORE);
    const request = store.get('workspace');

    request.onsuccess = () => {
      const value = request.result as AndroidFallbackWorkspaceState | undefined;
      resolve(value ?? createDefaultWorkspaceState());
    };

    request.onerror = () => resolve(createDefaultWorkspaceState());
  });
}

async function getSessionState(): Promise<AndroidFallbackSessionState> {
  const db = await openDb();

  if (!db) {
    return createDefaultSessionState();
  }

  return new Promise((resolve) => {
    const transaction = db.transaction(SESSION_STORE, 'readonly');
    const store = transaction.objectStore(SESSION_STORE);
    const request = store.get('session');

    request.onsuccess = () => {
      const value = request.result as AndroidFallbackSessionState | undefined;
      resolve(value ?? createDefaultSessionState());
    };

    request.onerror = () => resolve(createDefaultSessionState());
  });
}

export async function loadAndroidFallbackState(): Promise<AndroidFallbackState> {
  const [workspace, session] = await Promise.all([getWorkspaceState(), getSessionState()]);

  return { workspace, session };
}

export async function saveAndroidFallbackWorkspace(files: Record<string, PersistedDirent>, deletedPaths: string[]) {
  const db = await openDb();

  if (!db) {
    return;
  }

  const state: AndroidFallbackWorkspaceState = {
    key: 'workspace',
    files,
    deletedPaths,
    updatedAt: new Date().toISOString(),
  };

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(WORKSPACE_STORE, 'readwrite');
    const store = transaction.objectStore(WORKSPACE_STORE);
    const request = store.put(state);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to save workspace state'));
  });
}

export async function updateAndroidFallbackSession(partial: Partial<AndroidFallbackSessionState>) {
  const db = await openDb();

  if (!db) {
    return;
  }

  const current = await getSessionState();
  const state: AndroidFallbackSessionState = {
    ...current,
    ...partial,
    key: 'session',
    updatedAt: new Date().toISOString(),
  };

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SESSION_STORE, 'readwrite');
    const store = transaction.objectStore(SESSION_STORE);
    const request = store.put(state);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to save session state'));
  });
}

export async function resetAndroidFallbackStorage() {
  const db = await openDb();

  if (!db) {
    return;
  }

  await Promise.all([
    new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(WORKSPACE_STORE, 'readwrite');
      const store = transaction.objectStore(WORKSPACE_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Failed to clear workspace store'));
    }),
    new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(SESSION_STORE, 'readwrite');
      const store = transaction.objectStore(SESSION_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Failed to clear session store'));
    }),
  ]);
}

export async function getAndroidFallbackPersistenceStatus() {
  const state = await loadAndroidFallbackState();

  return {
    available: isIndexedDBAvailable(),
    hasSavedFiles: Object.keys(state.workspace.files).length > 0,
    lastOpenedFile: state.session.lastOpenedFile,
  };
}
