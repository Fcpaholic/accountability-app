import { useState, useCallback, useEffect, useRef } from 'react';
import { getData, saveData } from './lib/storage.js';
import { today } from './lib/dates.js';
import {
  getSyncToken, getSyncGistId, clearSyncToken,
  fetchFromGist, pushToGist, mergeData,
} from './lib/gistSync.js';
import AppHeader from './components/AppHeader.jsx';
import MotivationBanner from './components/MotivationBanner.jsx';
import Dashboard from './components/Dashboard.jsx';
import HeatmapCalendar from './components/HeatmapCalendar.jsx';
import WeightTracker from './components/WeightTracker.jsx';
import StatsView from './components/StatsView.jsx';
import SyncSetup from './components/SyncSetup.jsx';

const TABS = [
  { id: 'dashboard', label: '⚡ Dashboard' },
  { id: 'calendar', label: '📅 Calendar' },
  { id: 'weight', label: '⚖ Weight' },
  { id: 'stats', label: '📊 Stats' },
];

export default function App() {
  const [data, setData] = useState(() => getData());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | synced | error
  const [showSetup, setShowSetup] = useState(false);
  const [hasToken, setHasToken] = useState(() => !!getSyncToken());
  const pushTimer = useRef(null);
  const todayStr = today();

  const refresh = useCallback(() => {
    const local = getData();
    setData(local);

    const token = getSyncToken();
    const gistId = getSyncGistId();
    if (!token || !gistId) return;

    // Debounced push
    clearTimeout(pushTimer.current);
    setSyncStatus('syncing');
    pushTimer.current = setTimeout(() => {
      pushToGist(token, gistId, getData())
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('error'));
    }, 1500);
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // On mount: if token+gistId exist, pull and merge; otherwise show setup
  useEffect(() => {
    const token = getSyncToken();
    const gistId = getSyncGistId();
    if (token && gistId) {
      setSyncStatus('syncing');
      fetchFromGist(token, gistId)
        .then((remote) => {
          if (remote) {
            const local = getData();
            const merged = mergeData(local, remote);
            saveData(merged);
            setData(merged);
          }
          setSyncStatus('synced');
        })
        .catch(() => setSyncStatus('error'));
    } else if (!token) {
      setShowSetup(true);
    }
  }, []);

  const pullAndMerge = useCallback(async (token, gistId) => {
    setSyncStatus('syncing');
    try {
      const remote = await fetchFromGist(token, gistId);
      if (remote) {
        const local = getData();
        const merged = mergeData(local, remote);
        saveData(merged);
        setData(merged);
        // Push merged result back so both devices have the same state
        await pushToGist(token, gistId, merged);
      }
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
  }, []);

  const handleSyncComplete = useCallback((token, gistId) => {
    setShowSetup(false);
    if (token && gistId) {
      setHasToken(true);
      showToast('Sync enabled! Pulling data…', 'success');
      pullAndMerge(token, gistId);
    }
  }, [showToast, pullAndMerge]);

  const handleDisconnectSync = useCallback(() => {
    clearSyncToken();
    setHasToken(false);
    setSyncStatus('idle');
    showToast('Sync disconnected.', 'warn');
  }, [showToast]);

  const syncIndicator = syncStatus === 'syncing' ? '↻'
    : syncStatus === 'synced' ? '✓'
    : syncStatus === 'error' ? '⚠'
    : null;

  const syncColor = syncStatus === 'synced' ? 'text-emerald-400'
    : syncStatus === 'error' ? 'text-red-400'
    : 'text-zinc-400';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {showSetup && <SyncSetup onComplete={handleSyncComplete} />}

      <AppHeader data={data} todayStr={todayStr} />
      <MotivationBanner data={data} todayStr={todayStr} />

      {/* Tab nav */}
      <div className="border-b border-zinc-800 sticky top-0 z-10 bg-zinc-950/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <nav className="flex">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Sync indicator */}
          <div className="flex items-center gap-2 text-xs pr-1">
            {hasToken ? (
              <>
                <span className={`font-mono ${syncColor} ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}>
                  {syncIndicator}
                </span>
                <span className={`${syncColor} hidden sm:inline`}>
                  {syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'synced' ? 'Synced' : 'Sync error'}
                </span>
                <button
                  onClick={handleDisconnectSync}
                  className="text-zinc-600 hover:text-zinc-400 ml-1 hidden sm:inline"
                  title="Disconnect sync"
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowSetup(true)}
                className="text-zinc-500 hover:text-emerald-400 transition-colors"
                title="Enable cross-device sync"
              >
                🔄 Sync
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            data={data}
            onRefresh={refresh}
            todayStr={todayStr}
            showToast={showToast}
          />
        )}
        {activeTab === 'calendar' && (
          <HeatmapCalendar data={data} todayStr={todayStr} />
        )}
        {activeTab === 'weight' && (
          <WeightTracker
            data={data}
            onRefresh={refresh}
            todayStr={todayStr}
            showToast={showToast}
          />
        )}
        {activeTab === 'stats' && (
          <StatsView data={data} todayStr={todayStr} />
        )}
      </main>

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg text-sm font-semibold shadow-xl animate-slide-in ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toast.type === 'danger'
              ? 'bg-red-600 text-white'
              : 'bg-amber-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
