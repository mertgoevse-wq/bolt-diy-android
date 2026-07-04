/**
 * GitHubSyncPanel
 *
 * Mobile-friendly panel for GitHub sync in the Android/fallback workflow.
 *
 * Shows:
 *   - Repository URL input (saved locally)
 *   - Branch name input
 *   - Last sync status + timestamp
 *   - Uncommitted changes count
 *   - "Commit changes" button — disabled with explanation
 *   - "Push to GitHub" button — disabled with explanation
 *
 * The commit and push buttons are DISABLED because:
 *   - On Android, WebContainer is not available (no local git runtime)
 *   - Remote Runtime backend is not yet implemented
 *
 * This panel does NOT fake any git operations. It clearly explains
 * what's not available and what the user can do instead.
 *
 * The existing GitHub settings tab (token connection, repo browsing)
 * is separate and still works — this panel focuses on the sync workflow.
 */

import { useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import {
  githubSyncStore,
  setSyncRepoUrl,
  setSyncBranch,
  isRepoConfigured,
} from '~/lib/stores/github-sync';
import { runtimeModeStore } from '~/lib/stores/runtime-mode';
import { useStore as useNanostore } from '@nanostores/react';

// GitHub logo
const GithubLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path
      fill="currentColor"
      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
    />
  </svg>
);

export function GitHubSyncPanel() {
  const sync = useStore(githubSyncStore);
  const runtime = useNanostore(runtimeModeStore);

  const [urlInput, setUrlInput] = useState(sync.repoUrl);
  const [branchInput, setBranchInput] = useState(sync.branch);

  const handleSaveConfig = useCallback(() => {
    const trimmedUrl = urlInput.trim();

    // Basic URL validation
    if (trimmedUrl && !trimmedUrl.startsWith('https://github.com/') && !trimmedUrl.startsWith('http://github.com/')) {
      toast.error('Repository URL should start with https://github.com/');
      return;
    }

    setSyncRepoUrl(trimmedUrl);
    setSyncBranch(branchInput.trim() || 'main');
    toast.success('GitHub sync configuration saved');
  }, [urlInput, branchInput]);

  // Check if runtime supports git operations
  const gitAvailable = runtime.capabilities.commandExecution && runtime.capabilities.terminal;
  const isRemoteMode = runtime.mode === 'remote';
  const isWebContainerMode = runtime.mode === 'webcontainer' && runtime.webContainerAvailable;

  // Explanation for disabled buttons
  const disabledReason = !isRepoConfigured()
    ? 'Configure a repository URL first'
    : !gitAvailable && !isRemoteMode && !isWebContainerMode
      ? 'Git operations require WebContainer (desktop) or Remote Runtime. On Android Fallback Mode, there is no local git runtime.'
      : isRemoteMode && !runtime.remoteRuntimeUrl
        ? 'Set a Remote Runtime URL in Settings → Runtime Mode first'
        : 'Not yet implemented';

  const isCommitDisabled = !isRepoConfigured() || (!gitAvailable && !isRemoteMode && !isWebContainerMode) || (isRemoteMode && !runtime.remoteRuntimeUrl) || true; // always disabled — not implemented
  const isPushDisabled = isCommitDisabled;

  const formatTimestamp = (iso: string | null): string => {
    if (!iso) return 'Never';
    try {
      const date = new Date(iso);
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GithubLogo className="w-5 h-5 text-bolt-elements-textPrimary" />
        <h2 className="text-lg font-medium text-bolt-elements-textPrimary">GitHub Sync</h2>
      </motion.div>

      {/* Info banner */}
      <motion.div
        className={classNames(
          'rounded-lg p-3 flex items-start gap-2 text-sm',
          'bg-blue-50 dark:bg-blue-950/20',
          'border border-blue-200 dark:border-blue-800/50',
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="i-ph:info-fill w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="text-blue-800 dark:text-blue-200 leading-snug">
          Configure your GitHub repository here. Commit and push are currently disabled on mobile — they require a
          remote runtime server (coming soon). On desktop with WebContainer, use the full Git panel in the workbench.
        </div>
      </motion.div>

      {/* Configuration */}
      <motion.div
        className={classNames(
          'rounded-lg shadow-sm dark:shadow-none p-4 space-y-4',
          'bg-white dark:bg-[#0A0A0A]',
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2">
          <div className="i-ph:gear-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Repository Configuration</span>
        </div>

        {/* Repo URL */}
        <div>
          <label className="block text-sm text-bolt-elements-textSecondary mb-2">Repository URL</label>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://github.com/your-username/your-repo"
            className={classNames(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
              'text-bolt-elements-textPrimary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'transition-all duration-200',
              'placeholder:text-bolt-elements-textTertiary',
            )}
          />
        </div>

        {/* Branch */}
        <div>
          <label className="block text-sm text-bolt-elements-textSecondary mb-2">Branch</label>
          <input
            type="text"
            value={branchInput}
            onChange={(e) => setBranchInput(e.target.value)}
            placeholder="main"
            className={classNames(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
              'text-bolt-elements-textPrimary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'transition-all duration-200',
              'placeholder:text-bolt-elements-textTertiary',
            )}
          />
        </div>

        <button
          onClick={handleSaveConfig}
          className={classNames(
            'w-full px-4 py-2 rounded-lg text-sm font-medium',
            'bg-purple-500 text-white',
            'hover:bg-purple-600',
            'transition-all duration-200',
            'transform active:scale-95',
          )}
        >
          Save Configuration
        </button>
      </motion.div>

      {/* Sync Status */}
      <motion.div
        className={classNames(
          'rounded-lg shadow-sm dark:shadow-none p-4 space-y-3',
          'bg-white dark:bg-[#0A0A0A]',
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center gap-2">
          <div className="i-ph:clock-countdown-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Sync Status</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-bolt-elements-textSecondary">Status:</span>{' '}
            <span
              className={classNames(
                'font-medium',
                sync.syncStatus === 'synced' && 'text-green-600 dark:text-green-400',
                sync.syncStatus === 'error' && 'text-red-500',
                sync.syncStatus === 'not-configured' && 'text-bolt-elements-textSecondary',
                sync.syncStatus === 'idle' && 'text-amber-600 dark:text-amber-400',
                sync.syncStatus === 'syncing' && 'text-blue-500',
              )}
            >
              {sync.syncStatus === 'not-configured'
                ? 'Not configured'
                : sync.syncStatus === 'idle'
                  ? 'Ready'
                  : sync.syncStatus === 'synced'
                    ? 'Synced'
                    : sync.syncStatus === 'error'
                      ? 'Error'
                      : 'Syncing'}
            </span>
          </div>
          <div>
            <span className="text-bolt-elements-textSecondary">Last sync:</span>{' '}
            <span className="font-medium text-bolt-elements-textPrimary">{formatTimestamp(sync.lastSyncedAt)}</span>
          </div>
          <div>
            <span className="text-bolt-elements-textSecondary">Uncommitted:</span>{' '}
            <span className="font-medium text-bolt-elements-textPrimary">{sync.uncommittedCount} files</span>
          </div>
          <div>
            <span className="text-bolt-elements-textSecondary">Branch:</span>{' '}
            <span className="font-medium text-bolt-elements-textPrimary">{sync.branch}</span>
          </div>
        </div>

        {sync.errorMessage && (
          <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-lg p-2">
            {sync.errorMessage}
          </div>
        )}
      </motion.div>

      {/* Actions */}
      <motion.div
        className={classNames(
          'rounded-lg shadow-sm dark:shadow-none p-4 space-y-3',
          'bg-white dark:bg-[#0A0A0A]',
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <div className="i-ph:arrows-clockwise-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Actions</span>
        </div>

        {/* Commit button */}
        <div>
          <button
            disabled={isCommitDisabled}
            className={classNames(
              'w-full px-4 py-2.5 rounded-lg text-sm font-medium',
              'flex items-center justify-center gap-2',
              'transition-all duration-200',
              isCommitDisabled
                ? 'bg-gray-100 dark:bg-[#1A1A1A] text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'bg-[#303030] text-white hover:bg-[#5E41D0] transform active:scale-95',
            )}
          >
            <div className="i-ph:git-commit-fill w-4 h-4" />
            Commit Changes
          </button>
          {isCommitDisabled && (
            <p className="text-xs text-bolt-elements-textSecondary mt-1.5 leading-relaxed">
              {disabledReason}
            </p>
          )}
        </div>

        {/* Push button */}
        <div>
          <button
            disabled={isPushDisabled}
            className={classNames(
              'w-full px-4 py-2.5 rounded-lg text-sm font-medium',
              'flex items-center justify-center gap-2',
              'transition-all duration-200',
              isPushDisabled
                ? 'bg-gray-100 dark:bg-[#1A1A1A] text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'bg-[#303030] text-white hover:bg-[#5E41D0] transform active:scale-95',
            )}
          >
            <div className="i-ph:upload-simple-fill w-4 h-4" />
            Push to GitHub
          </button>
          {isPushDisabled && (
            <p className="text-xs text-bolt-elements-textSecondary mt-1.5 leading-relaxed">
              {disabledReason}
            </p>
          )}
        </div>
      </motion.div>

      {/* Token connection hint */}
      <motion.div
        className={classNames(
          'rounded-lg p-3 flex items-start gap-2 text-sm',
          'bg-amber-50 dark:bg-amber-950/20',
          'border border-amber-200 dark:border-amber-800/50',
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="i-ph:lightbulb-fill w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="text-amber-800 dark:text-amber-200 leading-snug">
          To connect your GitHub account (for auth tokens), go to Settings → GitHub. The token connection works on
          mobile — it's the git operations that need a runtime.
        </div>
      </motion.div>

      {/* TODO notice */}
      <motion.div
        className={classNames(
          'rounded-lg p-3 flex items-start gap-2 text-xs',
          'bg-gray-50 dark:bg-[#0A0A0A]',
          'border border-gray-200 dark:border-[#1A1A1A]',
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="i-ph:wrench-fill w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
        <div className="text-gray-500 dark:text-gray-500 leading-relaxed">
          <strong>TODO:</strong> Implement real GitHub API integration for commit and push via Remote Runtime. The
          current panel saves configuration only — no git operations are performed.
        </div>
      </motion.div>
    </div>
  );
}
