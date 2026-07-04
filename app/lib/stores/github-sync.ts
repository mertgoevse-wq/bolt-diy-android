/**
 * GitHub Sync Store
 *
 * Tracks the GitHub sync state for the mobile/fallback workflow.
 * The user can configure a repository URL and branch name. The
 * sync status is tracked locally.
 *
 * Real git operations (commit, push) require either:
 *   - WebContainer (desktop only), or
 *   - Remote Runtime (not yet implemented)
 *
 * This store persists the repo URL and branch to localStorage so
 * the user doesn't lose their configuration between sessions.
 */

import { atom } from 'nanostores';

/*
 * ---------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------
 */

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'not-configured';

export interface GitHubSyncState {
  /** Repository URL (e.g. https://github.com/user/repo) */
  repoUrl: string;

  /** Branch name (e.g. main, dev) */
  branch: string;

  /** Last sync status */
  syncStatus: SyncStatus;

  /** Timestamp of last successful sync (ISO string) */
  lastSyncedAt: string | null;

  /** Error message if sync failed */
  errorMessage: string | null;

  /** Number of uncommitted changes (tracked locally) */
  uncommittedCount: number;
}

/*
 * ---------------------------------------------------------------------------
 * Persistence
 * ---------------------------------------------------------------------------
 */

const STORAGE_KEY = 'bolt_github_sync_state';

function loadSavedState(): Partial<GitHubSyncState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return {};
}

function persistState(state: GitHubSyncState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        repoUrl: state.repoUrl,
        branch: state.branch,
        syncStatus: state.syncStatus,
        lastSyncedAt: state.lastSyncedAt,
        errorMessage: state.errorMessage,
      }),
    );
  } catch {
    // ignore
  }
}

/*
 * ---------------------------------------------------------------------------
 * Store
 * ---------------------------------------------------------------------------
 */

function createInitialState(): GitHubSyncState {
  const saved = loadSavedState();

  return {
    repoUrl: saved.repoUrl || '',
    branch: saved.branch || 'main',
    syncStatus: saved.syncStatus || 'not-configured',
    lastSyncedAt: saved.lastSyncedAt || null,
    errorMessage: saved.errorMessage || null,
    uncommittedCount: 0,
  };
}

export const githubSyncStore = atom<GitHubSyncState>(createInitialState());

// Subscribe to persist changes
githubSyncStore.listen((state) => {
  persistState(state);
});

/*
 * ---------------------------------------------------------------------------
 * Actions
 * ---------------------------------------------------------------------------
 */

/**
 * Set the repository URL.
 */
export function setSyncRepoUrl(url: string): void {
  const current = githubSyncStore.get();
  githubSyncStore.set({
    ...current,
    repoUrl: url,
    syncStatus: url ? 'idle' : 'not-configured',
  });
}

/**
 * Set the branch name.
 */
export function setSyncBranch(branch: string): void {
  const current = githubSyncStore.get();
  githubSyncStore.set({
    ...current,
    branch: branch || 'main',
  });
}

/**
 * Mark sync as succeeded.
 */
export function markSynced(): void {
  const current = githubSyncStore.get();
  githubSyncStore.set({
    ...current,
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
    errorMessage: null,
    uncommittedCount: 0,
  });
}

/**
 * Mark sync as failed.
 */
export function markSyncError(message: string): void {
  const current = githubSyncStore.get();
  githubSyncStore.set({
    ...current,
    syncStatus: 'error',
    errorMessage: message,
  });
}

/**
 * Track uncommitted changes count.
 */
export function setUncommittedCount(count: number): void {
  const current = githubSyncStore.get();
  githubSyncStore.set({
    ...current,
    uncommittedCount: count,
  });
}

/**
 * Check if a repository is configured.
 */
export function isRepoConfigured(): boolean {
  return githubSyncStore.get().repoUrl.trim().length > 0;
}
