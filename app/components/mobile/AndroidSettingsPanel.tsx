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
import {
  runtimeModeStore,
  resetRuntimeMode,
  setRuntimeMode,
  setRemoteRuntimeUrl,
  setRemoteAuthToken,
  setRemoteWorkspaceId,
  type RuntimeMode,
} from '~/lib/stores/runtime-mode';
import { getAndroidFallbackPersistenceStatus } from '~/lib/persistence/androidFallbackStorage';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { RemoteRuntimeClient } from '~/lib/remote-runtime/RemoteRuntimeClient';

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
  const [tokenInput, setTokenInput] = useState(runtime.remoteAuthToken);
  const [workspaceInput, setWorkspaceInput] = useState(runtime.remoteWorkspaceId);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'checking' | 'connected' | 'failed'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);

  useEffect(() => {
    setUrlInput(runtime.remoteRuntimeUrl);
    setConnectionState('disconnected');
    setLastError(null);
  }, [runtime.remoteRuntimeUrl]);

  useEffect(() => {
    setTokenInput(runtime.remoteAuthToken);
  }, [runtime.remoteAuthToken]);

  useEffect(() => {
    setWorkspaceInput(runtime.remoteWorkspaceId);
  }, [runtime.remoteWorkspaceId]);

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

  const handleTokenSave = useCallback(() => {
    setRemoteAuthToken(tokenInput.trim());
    toast.success('Auth token saved');
  }, [tokenInput]);

  const handleWorkspaceSave = useCallback(() => {
    setRemoteWorkspaceId(workspaceInput.trim());
    toast.success('Workspace ID saved');
  }, [workspaceInput]);

  const handleTestConnection = useCallback(async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      toast.error('Remote Runtime URL is required to test connection');
      return;
    }

    setTestingConnection(true);
    setConnectionState('checking');
    setLastError(null);

    try {
      const client = new RemoteRuntimeClient(trimmedUrl, tokenInput.trim(), workspaceInput.trim());
      const healthResponse = await client.health();
      
      if (healthResponse && healthResponse.ok) {
        setConnectionState('connected');
        toast.success(`Connected successfully! Server: ${healthResponse.service}, Version: ${healthResponse.version}`);
      } else {
        setConnectionState('failed');
        setLastError('Server responded with invalid payload');
        toast.error('Connection failed: Server responded with invalid payload');
      }
    } catch (err: any) {
      console.error('[RemoteRuntime] Test connection failed', err);
      const errMsg = err.message || 'Unknown error';
      setConnectionState('failed');
      setLastError(errMsg);
      toast.error(`Connection failed: ${errMsg}`);
    } finally {
      setTestingConnection(false);
    }
  }, [urlInput, tokenInput, workspaceInput]);

  const handleCreateWorkspace = useCallback(async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      toast.error('Remote Runtime URL is required to create a workspace');
      return;
    }

    setCreatingWorkspace(true);
    setLastError(null);

    try {
      const client = new RemoteRuntimeClient(trimmedUrl, tokenInput.trim());
      const workspaceResponse = await client.createWorkspace('node-clean');
      
      if (workspaceResponse && workspaceResponse.workspaceId) {
        setRemoteWorkspaceId(workspaceResponse.workspaceId);
        setWorkspaceInput(workspaceResponse.workspaceId);
        toast.success(`Workspace created successfully! ID: ${workspaceResponse.workspaceId}`);
      } else {
        throw new Error('Server did not return a workspace ID.');
      }
    } catch (err: any) {
      console.error('[RemoteRuntime] Workspace creation failed', err);
      const errMsg = err.message || 'Unknown error';
      setLastError(errMsg);
      toast.error(`Workspace creation failed: ${errMsg}`);
    } finally {
      setCreatingWorkspace(false);
    }
  }, [urlInput, tokenInput]);

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
            Remote Runtime Settings
          </h2>
          <div className="android-card-content gap-3.5">
            <p className="text-xs text-bolt-elements-textSecondary leading-relaxed">
              Remote Runtime lets Android run terminal commands and live previews on a trusted computer/server.
            </p>

            {/* URL Input */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-bolt-elements-textTertiary font-semibold uppercase tracking-wider">Server URL</span>
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
                <div className="text-[10px] text-green-500 flex items-center gap-0.5 mt-0.5">
                  <div className="i-ph:check-circle-fill w-3 h-3" />
                  <span>Saved: {runtime.remoteRuntimeUrl}</span>
                </div>
              )}
            </div>

            {/* Auth Token Input */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-bolt-elements-textTertiary font-semibold uppercase tracking-wider">Auth Token</span>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Bearer Auth Token"
                  disabled={runtime.mode !== 'remote'}
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-[#0A0A0A] border border-bolt-elements-borderColor text-bolt-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-bolt-elements-textTertiary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleTokenSave}
                  disabled={runtime.mode !== 'remote'}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
              </div>
              {runtime.remoteAuthToken && (
                <div className="text-[10px] text-green-500 flex items-center gap-0.5 mt-0.5">
                  <div className="i-ph:check-circle-fill w-3 h-3" />
                  <span>Token saved (length: {runtime.remoteAuthToken.length})</span>
                </div>
              )}
            </div>

            {/* Workspace ID Input */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-bolt-elements-textTertiary font-semibold uppercase tracking-wider">Workspace ID</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={workspaceInput}
                  onChange={(e) => setWorkspaceInput(e.target.value)}
                  placeholder="ws_xyz123"
                  disabled={runtime.mode !== 'remote'}
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-[#0A0A0A] border border-bolt-elements-borderColor text-bolt-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-bolt-elements-textTertiary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleWorkspaceSave}
                  disabled={runtime.mode !== 'remote'}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
              </div>
              {runtime.remoteWorkspaceId && (
                <div className="text-[10px] text-green-500 flex items-center gap-0.5 mt-0.5">
                  <div className="i-ph:check-circle-fill w-3 h-3" />
                  <span>Saved ID: {runtime.remoteWorkspaceId}</span>
                </div>
              )}
            </div>

            {/* Connection Status & Errors */}
            <div className="flex flex-col gap-1.5 mt-1 border-t border-bolt-elements-borderColor pt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-bolt-elements-textSecondary">Connection Status:</span>
                <span className={classNames('font-semibold uppercase text-[10px] px-2.5 py-0.5 rounded-full border', {
                  'bg-gray-500/10 border-gray-500/30 text-gray-400': connectionState === 'disconnected',
                  'bg-purple-500/10 border-purple-500/30 text-purple-400': connectionState === 'checking',
                  'bg-green-500/10 border-green-500/30 text-green-400': connectionState === 'connected',
                  'bg-red-500/10 border-red-500/30 text-red-400': connectionState === 'failed',
                })}>
                  {connectionState}
                </span>
              </div>
              {lastError && (
                <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-900/50 rounded-lg p-2 mt-1 break-all">
                  <strong>Error:</strong> {lastError}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleTestConnection}
                disabled={runtime.mode !== 'remote' || testingConnection || !urlInput.trim()}
                className="flex-1 android-secondary-btn text-xs font-semibold py-2 flex items-center justify-center gap-1.5 hover:bg-bolt-elements-background-depth-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingConnection ? (
                  <>
                    <div className="i-ph:spinner-gap animate-spin w-3.5 h-3.5" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <div className="i-ph:plugs-fill w-3.5 h-3.5" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCreateWorkspace}
                disabled={runtime.mode !== 'remote' || creatingWorkspace || !urlInput.trim()}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingWorkspace ? (
                  <>
                    <div className="i-ph:spinner-gap animate-spin w-3.5 h-3.5" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <div className="i-ph:plus-circle-fill w-3.5 h-3.5" />
                    <span>Create Workspace</span>
                  </>
                )}
              </button>
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
