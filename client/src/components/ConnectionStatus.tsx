import React, { useState, useEffect } from 'react';
import {
  ConnectionMode,
  getConnectionMode,
  subscribeConnectionStatus,
  getStoredBackendUrl,
  updateSocketBackendUrl,
  setDemoMode,
  testBackendConnection,
} from '../socket';
import {
  Wifi,
  WifiOff,
  Settings,
  Check,
  RefreshCw,
  X,
  PlayCircle,
  Activity,
  AlertCircle,
  ExternalLink,
  Laptop,
} from 'lucide-react';

interface ConnectionStatusProps {
  isConnected?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = () => {
  const [mode, setMode] = useState<ConnectionMode>(getConnectionMode());
  const [statusDetail, setStatusDetail] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState(getStoredBackendUrl());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs?: number } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeConnectionStatus((newMode, detail) => {
      setMode(newMode);
      if (detail) setStatusDetail(detail);
    });
    return unsubscribe;
  }, []);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUrl.trim()) return;
    updateSocketBackendUrl(serverUrl);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsOpen(false);
    }, 1200);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testBackendConnection(serverUrl || 'http://localhost:3000');
    setTestResult(res);
    setIsTesting(false);
  };

  const handleResetDefault = () => {
    const defaultUrl = 'http://localhost:3000';
    setServerUrl(defaultUrl);
    updateSocketBackendUrl(defaultUrl);
  };

  const handleToggleDemoMode = (enable: boolean) => {
    setDemoMode(enable);
    setIsOpen(false);
  };

  return (
    <aside aria-label="Server Connection" className="fixed bottom-4 right-4 z-40">
      {/* Floating Status Pill */}
      <div className="flex items-center gap-2 bg-slate-900/95 border border-slate-700/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-2xl text-xs font-semibold select-none">
        {mode === 'connected' && (
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-500/50"></span>
            <span className="hidden sm:inline">Server Live</span>
          </div>
        )}

        {mode === 'demo' && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 text-amber-300 hover:text-amber-200 transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-500/50"></span>
            <span className="font-bold">Offline / Demo Mode</span>
          </button>
        )}

        {mode === 'connecting' && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
            <span>Connecting...</span>
          </button>
        )}

        {mode === 'disconnected' && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors"
            title="Backend disconnected. Click to configure or switch to Demo Mode."
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
            <span className="font-semibold">Server Offline</span>
          </button>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Configure Backend Server & Demo Settings"
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Disconnected Quick Banner (prompts user immediately so they are never stuck) */}
      {mode === 'disconnected' && !isOpen && (
        <div className="absolute bottom-12 right-0 w-72 bg-gradient-to-br from-slate-900 to-rose-950/80 border border-rose-500/40 rounded-2xl shadow-2xl p-3 text-white space-y-2 animate-fade-in backdrop-blur-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Backend Not Detected</span>
            </div>
            <button onClick={() => setMode('connecting')} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-tight">
            Start your backend server or switch to Demo Mode to test with AI students instantly!
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleToggleDemoMode(true)}
              className="flex-1 py-1 px-2.5 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1 shadow-md transition-transform active:scale-95"
            >
              <PlayCircle className="w-3.5 h-3.5" /> Demo Mode
            </button>
            <button
              onClick={() => setIsOpen(true)}
              className="py-1 px-2.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              Configure
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal Popover */}
      {isOpen && (
        <div className="absolute bottom-10 right-0 w-80 sm:w-96 bg-[#151c2e] border border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-5 text-white space-y-4 animate-scale-in max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              {mode === 'connected' ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : mode === 'demo' ? (
                <Laptop className="w-4 h-4 text-amber-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-rose-400" />
              )}
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                Network & Server Settings
              </h4>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switch Card */}
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">In-Browser Demo Mode</span>
              <button
                type="button"
                onClick={() => handleToggleDemoMode(mode !== 'demo')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  mode === 'demo' ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    mode === 'demo' ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Enables complete standalone quiz engine in memory with simulated AI students. No backend deployment required.
            </p>
          </div>

          {/* Backend Server Config */}
          <form onSubmit={handleSaveUrl} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Backend Server URL
                </label>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                >
                  <Activity className="w-3 h-3" />
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://localhost:3000 or https://your-server.railway.app"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-xl text-[11px] border ${
                  testResult.ok
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  {testResult.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {testResult.message}
                </div>
              </div>
            )}

            {/* Quick URL Presets */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Quick Presets:</span>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setServerUrl('http://localhost:3000')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 font-mono"
                >
                  localhost:3000
                </button>
                {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && (
                  <button
                    type="button"
                    onClick={() => setServerUrl(`${window.location.protocol}//${window.location.hostname}:3000`)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 font-mono"
                  >
                    LAN Port 3000
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reset Default
              </button>

              <button
                type="submit"
                className="py-1.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Saved!
                  </>
                ) : (
                  'Connect & Save'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
};
