import React, { useState } from 'react';
import { getStoredBackendUrl, updateSocketBackendUrl } from '../socket';
import { Wifi, WifiOff, Settings, Check, RefreshCw, X } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState(getStoredBackendUrl());
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUrl.trim()) return;
    updateSocketBackendUrl(serverUrl);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsOpen(false);
    }, 1500);
  };

  const handleResetDefault = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('asi_backend_url');
    }
    const defaultUrl = 'http://localhost:3000';
    setServerUrl(defaultUrl);
    updateSocketBackendUrl(defaultUrl);
  };

  return (
    <aside aria-label="Server Connection" className="fixed bottom-4 right-4 z-40">
      {/* Floating Status Pill */}
      <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 backdrop-blur-md px-3 py-1.5 rounded-full shadow-xl text-xs font-semibold">
        {isConnected ? (
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="hidden sm:inline">Server Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>Connecting...</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Configure Backend Server URL"
          className="ml-1 p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Settings Modal Popover */}
      {isOpen && (
        <div className="absolute bottom-10 right-0 w-80 sm:w-96 bg-[#151c2e] border border-slate-700 rounded-2xl shadow-2xl p-4 text-white space-y-3 animate-scale-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-400" />
              )}
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Backend Server Settings
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Enter the URL of your Node.js Socket.IO backend server (e.g. Railway URL, LAN IP, or localhost:3000).
          </p>

          <form onSubmit={handleSaveUrl} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Backend Server URL
              </label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://your-railway-app.railway.app"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reset Default
              </button>

              <button
                type="submit"
                className="py-1.5 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-md"
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
