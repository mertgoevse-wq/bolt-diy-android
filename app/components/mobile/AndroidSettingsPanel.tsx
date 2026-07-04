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
import { runtimeModeStore, resetRuntimeMode } from '~/lib/stores/runtime-mode';
import { getAndroidFallbackPersistenceStatus } from '~/lib/persistence/androidFallbackStorage';
import { workbenchStore } from '~/lib/stores/workbench';

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
          <div className="android-card-content">
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
