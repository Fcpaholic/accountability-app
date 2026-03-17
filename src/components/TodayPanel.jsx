import { useState, useEffect } from 'react';
import {
  setCalories,
  addGymSession,
  removeGymSession,
  addRun,
  removeRun,
  setWeight,
} from '../lib/storage.js';
import { CALORIE_MAINTENANCE, getWeekCalorieTarget } from '../lib/dates.js';
import { getCalorieStatus, getDayKm } from '../lib/calculations.js';

const calorieStatusStyle = (status) => {
  switch (status) {
    case 'deficit':
      return { bar: 'bg-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-950 border-emerald-700 text-emerald-300' };
    case 'warning':
      return { bar: 'bg-amber-500', text: 'text-amber-400', badge: 'bg-amber-950 border-amber-700 text-amber-300' };
    case 'surplus':
      return { bar: 'bg-red-500', text: 'text-red-400', badge: 'bg-red-950 border-red-700 text-red-300' };
    default:
      return { bar: 'bg-zinc-600', text: 'text-zinc-400', badge: 'bg-zinc-900 border-zinc-700 text-zinc-400' };
  }
};

export default function TodayPanel({ data, onRefresh, dateStr, todayStr, showToast }) {
  const dayData = (data.days || {})[dateStr] || {
    calories: null,
    gymSessions: 0,
    runs: [],
    weight: null,
  };

  const [calInput, setCalInput] = useState(
    dayData.calories !== null ? String(dayData.calories) : ''
  );
  const [weightInput, setWeightInput] = useState(
    dayData.weight !== null ? String(dayData.weight) : ''
  );
  const [showRunInput, setShowRunInput] = useState(false);
  const [runKm, setRunKm] = useState('');

  // Reset inputs when switching days
  useEffect(() => {
    const d = (data.days || {})[dateStr] || {};
    setCalInput(d.calories != null ? String(d.calories) : '');
    setWeightInput(d.weight != null ? String(d.weight) : '');
    setShowRunInput(false);
    setRunKm('');
  }, [dateStr, data]);

  const calories = dayData.calories;
  const gymSessions = dayData.gymSessions || 0;
  const runs = dayData.runs || [];
  const weight = dayData.weight;

  const { target: calorieTarget, deficit, label: weekLabel, rationale, isDietBreak } =
    getWeekCalorieTarget(dateStr);

  const status = getCalorieStatus(calories, dateStr);
  const styles = calorieStatusStyle(status);
  const todayKm = getDayKm(dayData);

  const caloriePct = calories !== null
    ? Math.min((calories / CALORIE_MAINTENANCE) * 100, 100)
    : 0;

  const handleCaloriesSave = (val) => {
    const num = Number(val);
    if (val === '' || isNaN(num) || num < 0) return;
    onRefresh(setCalories(dateStr, num));
    const s = getCalorieStatus(num, dateStr);
    if (s === 'deficit') showToast('Target hit. Well done.', 'success');
    else if (s === 'surplus') showToast('Over maintenance. Fix it tomorrow.', 'danger');
    else showToast('Calories logged.', 'info');
  };

  const handleGymAdd = () => {
    onRefresh(addGymSession(dateStr));
    showToast('Gym session logged.', 'success');
  };

  const handleGymRemove = () => {
    if (gymSessions <= 0) return;
    onRefresh(removeGymSession(dateStr));
  };

  const handleRunAdd = () => {
    const km = Number(runKm);
    if (!runKm || isNaN(km) || km <= 0) return;
    onRefresh(addRun(dateStr, km));
    showToast(`${km} km logged. Keep running.`, 'success');
    setRunKm('');
    setShowRunInput(false);
  };

  const handleWeightSave = (val) => {
    const num = Number(val);
    if (val === '' || isNaN(num) || num <= 0) return;
    onRefresh(setWeight(dateStr, num));
    showToast(`Weight logged: ${num} kg`, 'success');
  };

  const isPastDay = dateStr < todayStr;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
      {isPastDay && (
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-400">
          ✏️ Editing past day — changes will sync to all devices.
        </div>
      )}

      {/* ── Weekly Protocol Card ─────────── */}
      <div className={`rounded-lg px-3 py-2.5 border text-xs space-y-0.5 ${
        isDietBreak
          ? 'bg-violet-950/60 border-violet-800'
          : 'bg-zinc-800/60 border-zinc-700'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`font-semibold ${isDietBreak ? 'text-violet-300' : 'text-zinc-300'}`}>
            {isDietBreak ? '🧬 ' : ''}{weekLabel}
          </span>
          <span className={`font-bold text-sm ${isDietBreak ? 'text-violet-400' : 'text-white'}`}>
            {calorieTarget} kcal
            {deficit > 0 && (
              <span className="text-xs font-normal text-zinc-500 ml-1">−{deficit}</span>
            )}
          </span>
        </div>
        <p className={`leading-snug ${isDietBreak ? 'text-violet-400/80' : 'text-zinc-500'}`}>
          {rationale}
        </p>
      </div>

      {/* ── Calories ──────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            Calories
          </label>
          {calories !== null && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${styles.badge}`}>
              {status === 'deficit' && (isDietBreak ? 'Maintenance ✓' : 'Deficit ✓')}
              {status === 'warning' && 'Over target'}
              {status === 'surplus' && 'Surplus ✗'}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="number"
            value={calInput}
            onChange={(e) => setCalInput(e.target.value)}
            onBlur={(e) => handleCaloriesSave(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCaloriesSave(calInput)}
            placeholder="kcal eaten"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-600 transition-colors"
          />
          <div className="flex flex-col justify-center text-right text-xs text-zinc-600 shrink-0">
            <span>target: {calorieTarget}</span>
            <span>maint: {CALORIE_MAINTENANCE}</span>
          </div>
        </div>

        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
            style={{ width: `${caloriePct}%` }}
          />
        </div>
        {calories !== null && (
          <p className={`text-xs ${styles.text}`}>
            {calories <= calorieTarget
              ? `${calorieTarget - calories} kcal under ${isDietBreak ? 'maintenance' : 'target'}`
              : calories < CALORIE_MAINTENANCE
              ? `${calories - calorieTarget} kcal over target · ${CALORIE_MAINTENANCE - calories} under maintenance`
              : `${calories - CALORIE_MAINTENANCE} kcal over maintenance`}
          </p>
        )}
      </section>

      {/* ── Gym ──────────────────────────── */}
      <section className="space-y-2">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Gym Sessions
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGymAdd}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-900/60 hover:bg-emerald-800/70 border border-emerald-800 text-emerald-300 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-95"
          >
            <span className="text-base">🏋</span>
            + Gym Session
          </button>
          {gymSessions > 0 && (
            <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
              <span className="text-sm font-bold text-emerald-400">{gymSessions}×</span>
              <button
                onClick={handleGymRemove}
                className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
                title="Remove session"
              >
                −
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Runs ──────────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            Running
          </label>
          {todayKm > 0 && (
            <span className="text-xs text-emerald-400 font-medium">{todayKm.toFixed(1)} km</span>
          )}
        </div>

        {!showRunInput ? (
          <button
            onClick={() => setShowRunInput(true)}
            className="w-full flex items-center justify-center gap-2 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-95"
          >
            <span className="text-base">🏃</span>
            + Run
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="number"
              value={runKm}
              onChange={(e) => setRunKm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRunAdd();
                if (e.key === 'Escape') { setShowRunInput(false); setRunKm(''); }
              }}
              autoFocus
              placeholder="km"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-600"
            />
            <button
              onClick={handleRunAdd}
              className="bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm font-semibold"
            >
              Add
            </button>
            <button
              onClick={() => { setShowRunInput(false); setRunKm(''); }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg px-3 py-2 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {runs.length > 0 && (
          <ul className="space-y-1">
            {runs.map((km, i) => (
              <li
                key={i}
                className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-1.5"
              >
                <span className="text-sm text-zinc-300">{km} km</span>
                <button
                  onClick={() => onRefresh(removeRun(dateStr, i))}
                  className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Weight ──────────────────────── */}
      <section className="space-y-2">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Weight (kg)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            onBlur={(e) => handleWeightSave(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleWeightSave(weightInput)}
            placeholder="e.g. 82.5"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-600 transition-colors"
          />
          {weight !== null && (
            <div className="flex items-center px-3 bg-zinc-800 border border-zinc-700 rounded-lg">
              <span className="text-sm font-medium text-zinc-300">{weight} kg</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
