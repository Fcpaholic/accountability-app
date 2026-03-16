import { useState, useCallback, useEffect, useRef } from 'react';
import { getData, saveData } from './lib/storage.js';
import { today } from './lib/dates.js';
import {
  getSyncToken, getSyncGistId, clearSyncToken,
  findOrCreateGist, fetchFromGist, pushToGist, mergeData,
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
  const [syncStatus, setSyncStatus] = useState('idle');
  const [showSetup, setShowSetup] = useState(false);
  const [hasToken, setHasToken] = useState(() => !!getSyncToken());
  const pushTimer = useRef(null);
  const todayStr = today();

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // One function for all sync operations.
  // Always calls findOrCreateGist so it never uses a stale cached gist ID.
  const syncNow = useCallback(async () => {
    const token = getSyncToken();
    if (!token) return;
    setSyncStatus('syncing');
    try {
      const gistId = await findOrCreateGist(token);
      const remote = await fetchFromGist(token, gistId);
      if (remote) {
        const local = getData();
        const merged = mergeData(local, remote);
        saveData(merged);
        setData(merged);
        await pushToGist(token, gistId, merged);
      }
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
  }, []);

  // On mount: sync if token exists, otherwise show setup
  useEffect(() => {
    if (getSyncToken()) {
      syncNow();
    } else {
      setShowSetup(true);
    }
  }, []);

  // Pull every 30s + on tab focus
  useEffect(() => {
    if (!hasToken) return;
    const interval = setInterval(syncNow, 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') syncNow(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, [hasToken, syncNow]);

  // Called after every local data change — debounced push
  const refresh = useCallback(() => {
    setData(getData());
    const token = getSyncToken();
    const gistId = getSyncGistId();
    if (!token || !gistId) return;
    clearTimeout(pushTimer.current);
    setSyncStatus('syncing');
    pushTimer.current = setTimeout(() => {
      pushToGist(token, gistId, getData())
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('error'));
    }, 1500);
  }, []);

  const handleSyncComplete = useCallback((token, gistId) => {
    setShowSetup(false);
    if (token && gistId) {
      setHasToken(true);
      showToast('Sync enabled!', 'success');
      syncNow();
    }
  }, [showToast, syncNow]);

  const handleDisconnectSync = useCallback(() => {
    clearSyncToken();
    setHasToken(false);
    setSyncStatus('idle');
    showToast('Sync disconnected.', 'warn');
  }, [showToast]);

  const syncColor = syncStatus === 'synced' ? 'text-emerald-400'
    : syncStatus === 'error' ? 'text-red-400'
    : 'text-zinc-400';

  const syncLabel = syncStatus === 'syncing' ? 'Syncing…'
    : syncStatus === 'synced' ? 'Synced'
    : syncStatus === 'error' ? 'Sync error'
    : '';

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

          <div className="flex items-center gap-2 text-xs pr-1">
            {hasToken ? (
              <>
                <span className={`${syncColor} ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}>
                  {syncStatus === 'syncing' ? '↻' : syncStatus === 'synced' ? '✓' : '⚠'}
                </span>
                <span className={`${syncColor} hidden sm:inline`}>{syncLabel}</span>
                <button onClick={handleDisconnectSync} className="text-zinc-600 hover:text-zinc-400 ml-1 hidden sm:inline" title="Disconnect sync">✕</button>
              </>
            ) : (
              <button onClick={() => setShowSetup(true)} className="text-zinc-500 hover:text-emerald-400 transition-colors">
                🔄 Sync
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && <Dashboard data={data} onRefresh={refresh} todayStr={todayStr} showToast={showToast} />}
        {activeTab === 'calendar' && <HeatmapCalendar data={data} todayStr={todayStr} />}
        {activeTab === 'weight' && <WeightTracker data={data} onRefresh={refresh} todayStr={todayStr} showToast={showToast} />}
        {activeTab === 'stats' && <StatsView data={data} todayStr={todayStr} />}
      </main>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg text-sm font-semibold shadow-xl animate-slide-in ${
          toast.type === 'success' ? 'bg-emerald-600 text-white'
          : toast.type === 'danger' ? 'bg-red-600 text-white'
          : 'bg-amber-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
