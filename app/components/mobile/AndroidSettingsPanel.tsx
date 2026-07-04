/**
 * AndroidSettingsPanel
 *
 * A simplified settings panel for the Android build.
 * Shows the most important settings for Android users:
 *   - Runtime mode status
 *   - API key configuration
 *   - Persistence status / reset
 *   - App info
 *
 * Full settings (Remix ControlPanel) require router context and
 * are not available in the SPA build without significant refactoring.
 */

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { toast } from 'react-toastify';
import { runtimeModeStore, resetRuntimeMode, setRuntimeMode, setRemoteRuntimeUrl, type RuntimeMode } from '~/lib/stores/runtime-mode';
import { getAndroidFallbackPersistenceStatus } from '~/lib/persistence/androidFallbackStorage';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';

interface PersistenceStatus {
  available: boolean;
  hasSavedFiles: boolean;
  lastOpenedFile?: string;
}

export default function AndroidSettingsPanel() {
  const runtime = useStore(runtimeModeStore);
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>({
    available: false,
    hasSavedFiles: false,
  });
  const [resetting, setResetting] = useState(false);
  const [urlInput, setUrlInput] = useState(runtime.remoteRuntimeUrl);

  useEffect(() => {
    setUrlInput(runtime.remoteRuntimeUrl);
  }, [runtime.remoteRuntimeUrl]);

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

  const handleModeChange = useCallback(
    (mode: RuntimeMode) => {
      if (mode === 'remote' && !urlInput.trim()) {
        toast.info('Enter a remote runtime URL below to use Remote Runtime mode');
      }

      setRuntimeMode(mode);
      toast.success(`Runtime mode set to: ${mode === 'remote' ? 'Remote Runtime' : 'Android Fallback'}`);
    },
    [urlInput],
  );

  useEffect(() => {
    let active = true;

    async function load() {
      const status = await getAndroidFallbackPersistenceStatus();

      if (active) {
        setPersistenceStatus(status);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const handleResetWorkspace = useCallback(async () => {
    if (!window.confirm('Reset your local Android workspace? This will delete all locally saved files.')) {
      return;
    }

    setResetting(true);

    try {
      await workbenchStore.resetLocalAndroidWorkspace();
      const status = await getAndroidFallbackPersistenceStatus();
      setPersistenceStatus(status);
      toast.success('Local workspace reset successfully');
    } catch (error) {
      console.error('[Settings] Reset failed', error);
      toast.error('Failed to reset workspace');
    } finally {
      setResetting(false);
    }
  }, []);

  const modeLabel = runtime.mode === 'android-fallback'
    ? 'Android Fallback Mode'
    : runtime.mode === 'webcontainer'
    ? 'WebContainer Mode'
    : 'Remote Runtime Mode';

  const modeColor = runtime.mode === 'android-fallback' ? '#f59e0b' : '#10b981';

  return (
    <div className="android-settings-panel">
      <header className="android-settings-header">
        <div className="i-ph:gear-six-fill android-settings-icon" />
        <h1 className="android-settings-title">Settings</h1>
      </header>

      <div className="android-settings-body">
        {/* Runtime Mode Card */}
        <section className="android-card">
          <h2 className="android-card-title">
            <div className="i-ph:cpu-fill" />
            Runtime Mode
          </h2>
          <div className="android-card-content gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => handleModeChange('android-fallback')}
                className={classNames('flex-1 py-2 rounded-lg text-xs font-semibold border transition-all', {
                  'bg-purple-600/15 border-purple-500/50 text-purple-400': runtime.mode === 'android-fallback',
                  'bg-transparent border-bolt-elements-borderColor text-bolt-elements-textSecondary': runtime.mode !== 'android-fallback',
                })}
              >
                Android Fallback
              </button>
              <button
                onClick={() => handleModeChange('remote')}
                className={classNames('flex-1 py-2 rounded-lg text-xs font-semibold border transition-all', {
                  'bg-purple-600/15 border-purple-500/50 text-purple-400': runtime.mode === 'remote',
                  'bg-transparent border-bolt-elements-borderColor text-bolt-elements-textSecondary': runtime.mode !== 'remote',
                })}
              >
                Remote Runtime
              </button>
            </div>

            <div className="android-mode-badge" style={{ backgroundColor: modeColor + '20', color: modeColor, borderColor: modeColor + '40' }}>
              <span className="android-mode-dot" style={{ backgroundColor: modeColor }} />
              {modeLabel}
            </div>

            <div className="android-capability-list">
              {[
                { label: 'File System (in-memory)', enabled: runtime.capabilities.fileSystem },
                { label: 'Persistent Storage (IndexedDB)', enabled: persistenceStatus.available },
                { label: 'Terminal', enabled: runtime.capabilities.terminal },
                { label: 'Dev Server / Preview', enabled: runtime.capabilities.devServer },
                { label: 'WebContainer', enabled: runtime.webContainerAvailable },
              ].map(({ label, enabled }) => (
                <div key={label} className="android-capability-row">
                  <div className={enabled ? 'i-ph:check-circle-fill android-cap-icon android-cap-enabled' : 'i-ph:x-circle-fill android-cap-icon android-cap-disabled'} />
                  <span className={enabled ? 'android-cap-label-enabled' : 'android-cap-label-disabled'}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Remote Runtime Card */}
        <section className={classNames('android-card', { 'opacity-60': runtime.mode !== 'remote' })}>
          <h2 className="android-card-title">
            <div className="i-ph:link-fill" />
            Remote Runtime URL
          </h2>
          <div className="android-card-content gap-3">
            <p className="text-xs text-bolt-elements-textSecondary leading-relaxed">
              Connect to a remote sandbox server for terminal command execution and app previews.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://runtime.example.com"
                disabled={runtime.mode !== 'remote'}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-[#0A0A0A] border border-bolt-elements-borderColor text-bolt-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-bolt-elements-textTertiary disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleUrlSave}
                disabled={runtime.mode !== 'remote'}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
            {runtime.remoteRuntimeUrl && (
              <div className="text-xs text-green-500 flex items-center gap-1">
                <div className="i-ph:check-circle-fill w-3.5 h-3.5" />
                <span>Saved: {runtime.remoteRuntimeUrl}</span>
              </div>
            )}
            <button
              disabled
              className="android-secondary-btn opacity-60 text-xs font-semibold py-2 mt-1 cursor-not-allowed"
            >
              <div className="i-ph:plugs-fill" />
              Test Connection (Backend TODO)
            </button>
          </div>
        </section>

        {/* Local Storage Card */}
        <section className="android-card">
          <h2 className="android-card-title">
            <div className="i-ph:hard-drive-fill" />
            Local Workspace
          </h2>
          <div className="android-card-content">
            {persistenceStatus.available ? (
              <>
                <div className={`android-storage-status ${persistenceStatus.hasSavedFiles ? 'android-storage-saved' : 'android-storage-empty'}`}>
                  <div className={persistenceStatus.hasSavedFiles ? 'i-ph:floppy-disk-fill' : 'i-ph:database'} />
                  <span>
                    {persistenceStatus.hasSavedFiles
                      ? 'Files saved locally on this device'
                      : 'No local workspace saved yet'}
                  </span>
                </div>
                {persistenceStatus.lastOpenedFile && (
                  <p className="android-storage-last">
                    Last file: {persistenceStatus.lastOpenedFile}
                  </p>
                )}
                <button
                  className="android-danger-btn"
                  onClick={handleResetWorkspace}
                  disabled={resetting || !persistenceStatus.hasSavedFiles}
                >
                  {resetting ? (
                    <><div className="i-ph:spinner-gap animate-spin" /> Resetting…</>
                  ) : (
                    <><div className="i-ph:trash-fill" /> Reset Local Workspace</>
                  )}
                </button>
              </>
            ) : (
              <p className="android-storage-unavailable">
                IndexedDB not available — files are stored in memory only and will be lost on app restart.
              </p>
            )}
          </div>
        </section>

        {/* App Info Card */}
        <section className="android-card">
          <h2 className="android-card-title">
            <div className="i-ph:info-fill" />
            About
          </h2>
          <div className="android-card-content android-about">
            <p className="android-about-name">bolt.diy Android</p>
            <p className="android-about-version">v1.0.0</p>
            <p className="android-about-desc">
              Android port of bolt.diy — AI-powered code generation in your pocket.
              WebContainer features (terminal, dev server, preview) require a desktop browser.
            </p>
            <button
              className="android-secondary-btn"
              onClick={() => {
                resetRuntimeMode();
                toast.info('Runtime mode reset to auto-detected');
              }}
            >
              <div className="i-ph:arrows-counter-clockwise" />
              Reset Runtime Mode
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
