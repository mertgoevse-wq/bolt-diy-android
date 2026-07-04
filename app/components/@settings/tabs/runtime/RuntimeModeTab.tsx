/**
 * RuntimeModeTab
 *
 * Settings tab that shows the current runtime mode and lets the user
 * switch between:
 *   - WebContainer Browser Mode (desktop only)
 *   - Android Fallback Mode
 *   - Remote Runtime URL
 *
 * The remote URL input is saved to localStorage. The backend for
 * remote runtime is not implemented yet — this just saves the URL
 * for future use.
 */

import { useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import {
  runtimeModeStore,
  setRuntimeMode,
  setRemoteRuntimeUrl,
  resetRuntimeMode,
  type RuntimeMode,
} from '~/lib/stores/runtime-mode';

interface ModeOption {
  id: RuntimeMode;
  label: string;
  description: string;
  icon: string;
  available: boolean;
  unavailableReason?: string;
}

export default function RuntimeModeTab() {
  const runtime = useStore(runtimeModeStore);
  const [urlInput, setUrlInput] = useState(runtime.remoteRuntimeUrl);

  const modes: ModeOption[] = [
    {
      id: 'webcontainer',
      label: 'WebContainer Browser Mode',
      description:
        'Full in-browser runtime. Supports terminal, package install, dev server, and live preview. Requires SharedArrayBuffer + cross-origin isolation.',
      icon: 'i-ph:browser-fill',
      available: runtime.webContainerAvailable,
      unavailableReason: runtime.isAndroid
        ? 'Not available on Android WebView (no SharedArrayBuffer)'
        : 'Not available in this browser (requires cross-origin isolation)',
    },
    {
      id: 'android-fallback',
      label: 'Android Fallback Mode',
      description:
        'In-memory file system. Code editing and AI chat work. Terminal, command execution, package install, dev server, and preview are disabled.',
      icon: 'i-ph:device-mobile-fill',
      available: true,
    },
    {
      id: 'remote',
      label: 'Remote Runtime',
      description:
        'Connect to a remote sandbox server for command execution, package install, and dev server. File editing stays local. Enter the remote runtime URL below.',
      icon: 'i-ph:cloud-fill',
      available: true,
    },
  ];

  const handleModeChange = useCallback(
    (mode: RuntimeMode) => {
      const option = modes.find((m) => m.id === mode);

      if (mode === 'remote' && !urlInput.trim()) {
        toast.info('Enter a remote runtime URL below to use Remote Runtime mode');
      }

      setRuntimeMode(mode);
      toast.success(`Runtime mode set to: ${option?.label ?? mode}`);
    },
    [urlInput],
  );

  const handleUrlSave = useCallback(() => {
    const trimmed = urlInput.trim();

    if (
      trimmed &&
      !trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('ws://') &&
      !trimmed.startsWith('wss://')
    ) {
      toast.error('URL must start with http://, https://, ws://, or wss://');
      return;
    }

    setRemoteRuntimeUrl(trimmed);
    toast.success(trimmed ? 'Remote runtime URL saved' : 'Remote runtime URL cleared');
  }, [urlInput]);

  const handleReset = useCallback(() => {
    resetRuntimeMode();
    toast.success('Runtime mode reset to auto-detected value');
  }, []);

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <motion.div
        className={classNames('rounded-lg shadow-sm dark:shadow-none p-4 space-y-3', 'bg-white dark:bg-[#0A0A0A]')}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="flex items-center gap-2">
          <div
            className={classNames(
              'w-4 h-4',
              runtime.mode === 'webcontainer'
                ? 'text-green-500'
                : runtime.mode === 'remote'
                  ? 'text-blue-500'
                  : 'text-amber-500',
            )}
          >
            <div
              className={classNames(
                'w-4 h-4',
                runtime.mode === 'webcontainer'
                  ? 'i-ph:check-circle-fill'
                  : runtime.mode === 'remote'
                    ? 'i-ph:cloud-fill'
                    : 'i-ph:warning-fill',
              )}
            />
          </div>
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Current Runtime</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-bolt-elements-textSecondary">Mode:</span>{' '}
            <span className="font-medium text-bolt-elements-textPrimary">
              {modes.find((m) => m.id === runtime.mode)?.label ?? runtime.mode}
            </span>
          </div>
          <div>
            <span className="text-bolt-elements-textSecondary">Detected:</span>{' '}
            <span className="font-medium text-bolt-elements-textPrimary">
              {runtime.autoDetected ? 'Auto' : 'Manual'}
            </span>
          </div>
          <div>
            <span className="text-bolt-elements-textSecondary">WebContainer:</span>{' '}
            <span
              className={classNames(
                'font-medium',
                runtime.webContainerAvailable ? 'text-green-600 dark:text-green-400' : 'text-red-500',
              )}
            >
              {runtime.webContainerAvailable ? 'Available' : 'Unavailable'}
            </span>
          </div>
          <div>
            <span className="text-bolt-elements-textSecondary">Android:</span>{' '}
            <span
              className={classNames(
                'font-medium',
                runtime.isAndroid ? 'text-amber-600 dark:text-amber-400' : 'text-bolt-elements-textPrimary',
              )}
            >
              {runtime.isAndroid ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Mode Selection */}
      <motion.div
        className={classNames('rounded-lg shadow-sm dark:shadow-none p-4 space-y-3', 'bg-white dark:bg-[#0A0A0A]')}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="i-ph:cpu-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Runtime Mode</span>
        </div>

        <div className="space-y-2">
          {modes.map((option) => {
            const isSelected = runtime.mode === option.id;

            return (
              <label
                key={option.id}
                className={classNames(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  isSelected
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                    : 'border-[#E5E5E5] dark:border-[#1A1A1A] hover:border-purple-300 dark:hover:border-purple-700',
                  !option.available && 'opacity-50 cursor-not-allowed',
                )}
                onClick={(e) => {
                  if (!option.available) {
                    e.preventDefault();
                    return;
                  }

                  handleModeChange(option.id);
                }}
              >
                {/* Radio */}
                <div
                  className={classNames(
                    'flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    isSelected ? 'border-purple-500' : 'border-gray-300 dark:border-gray-600',
                  )}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                </div>

                {/* Icon */}
                <div
                  className={classNames(
                    'flex-shrink-0 w-5 h-5 mt-0.5',
                    option.icon,
                    isSelected ? 'text-purple-500' : 'text-bolt-elements-textSecondary',
                  )}
                />

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-bolt-elements-textPrimary">{option.label}</div>
                  <div className="text-xs text-bolt-elements-textSecondary mt-0.5 leading-relaxed">
                    {option.description}
                  </div>
                  {!option.available && option.unavailableReason && (
                    <div className="text-xs text-red-500 mt-1">{option.unavailableReason}</div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </motion.div>

      {/* Remote Runtime URL */}
      <motion.div
        className={classNames(
          'rounded-lg shadow-sm dark:shadow-none p-4 space-y-3',
          'bg-white dark:bg-[#0A0A0A]',
          runtime.mode !== 'remote' && 'opacity-60',
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="i-ph:link-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Remote Runtime URL</span>
        </div>

        <p className="text-xs text-bolt-elements-textSecondary">
          Enter the URL of a remote runtime server that provides command execution, package install, and dev server
          capabilities. This is saved locally and will be used when Remote Runtime mode is active.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://runtime.example.com or wss://runtime.example.com/ws"
            disabled={runtime.mode !== 'remote'}
            className={classNames(
              'flex-1 px-3 py-2 rounded-lg text-sm',
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
              'text-bolt-elements-textPrimary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'transition-all duration-200',
              'placeholder:text-bolt-elements-textTertiary',
              'disabled:cursor-not-allowed',
            )}
          />
          <button
            onClick={handleUrlSave}
            disabled={runtime.mode !== 'remote'}
            className={classNames(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'bg-purple-500 text-white',
              'hover:bg-purple-600',
              'transition-all duration-200',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            Save
          </button>
        </div>

        {runtime.remoteRuntimeUrl && (
          <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <div className="i-ph:check-circle-fill w-3 h-3" />
            <span>Saved: {runtime.remoteRuntimeUrl}</span>
          </div>
        )}

        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2 flex items-start gap-2">
          <div className="i-ph:info-fill w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            The remote runtime backend is not yet implemented. The URL is saved for future use when the backend becomes
            available.
          </span>
        </div>
      </motion.div>

      {/* Capability Summary */}
      <motion.div
        className={classNames('rounded-lg shadow-sm dark:shadow-none p-4 space-y-3', 'bg-white dark:bg-[#0A0A0A]')}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="i-ph:list-checks-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Capabilities</span>
        </div>

        <div className="space-y-1.5">
          {(
            [
              ['fileSystem', 'File System (read/write/edit)'],
              ['terminal', 'Interactive Terminal'],
              ['commandExecution', 'Command Execution'],
              ['packageInstall', 'Package Install (npm/pnpm)'],
              ['devServer', 'Dev Server'],
              ['preview', 'Live Preview'],
              ['persistentFileSystem', 'Persistent File System'],
            ] as const
          ).map(([key, label]) => {
            const enabled = runtime.capabilities[key];
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                <div
                  className={classNames(
                    'w-4 h-4 flex items-center justify-center',
                    enabled ? 'text-green-500' : 'text-red-400',
                  )}
                >
                  <div
                    className={classNames('w-3.5 h-3.5', enabled ? 'i-ph:check-circle-fill' : 'i-ph:x-circle-fill')}
                  />
                </div>
                <span
                  className={classNames(
                    enabled ? 'text-bolt-elements-textPrimary' : 'text-bolt-elements-textSecondary',
                  )}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Reset button */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <button
          onClick={handleReset}
          className={classNames(
            'w-full px-4 py-2 rounded-lg text-sm font-medium',
            'border border-[#E5E5E5] dark:border-[#1A1A1A]',
            'text-bolt-elements-textSecondary',
            'hover:bg-gray-50 dark:hover:bg-[#1A1A1A]',
            'transition-all duration-200',
          )}
        >
          Reset to Auto-Detected Mode
        </button>
      </motion.div>
    </div>
  );
}
