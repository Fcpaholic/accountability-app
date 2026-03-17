import { useState } from 'react';
import { getWeekStart, getWeekDays, formatDate, parseDate, shortLabel, CHALLENGE_START } from '../lib/dates.js';
import { getWeekStats } from '../lib/calculations.js';
import TodayPanel from './TodayPanel.jsx';
import WeekProgress from './WeekProgress.jsx';

function dayOffset(dateStr, offset) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + offset);
  return formatDate(d);
}

function dayLabel(dateStr, todayStr) {
  if (dateStr === todayStr) return 'Today';
  const diff = Math.round((parseDate(todayStr) - parseDate(dateStr)) / (1000 * 60 * 60 * 24));
  if (diff === 1) return 'Yesterday';
  if (diff > 1) return `${diff} days ago`;
  return shortLabel(dateStr);
}

export default function Dashboard({ data, onRefresh, todayStr, showToast }) {
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const weekStart = getWeekStart(selectedDate);
  const weekDays = getWeekDays(weekStart);
  const weekStats = getWeekStats(weekDays, data.days || {});

  const canGoBack = selectedDate > CHALLENGE_START;
  const canGoForward = selectedDate < todayStr;

  return (
    <div className="space-y-6">
      {/* Day navigator */}
      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
        <button
          onClick={() => setSelectedDate(dayOffset(selectedDate, -1))}
          disabled={!canGoBack}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-90"
          aria-label="Previous day"
        >
          ←
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold text-white">{dayLabel(selectedDate, todayStr)}</p>
          <p className="text-xs text-zinc-500">{shortLabel(selectedDate)}</p>
        </div>

        <button
          onClick={() => setSelectedDate(dayOffset(selectedDate, +1))}
          disabled={!canGoForward}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-90"
          aria-label="Next day"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodayPanel
          data={data}
          onRefresh={onRefresh}
          dateStr={selectedDate}
          todayStr={todayStr}
          showToast={showToast}
        />
        <WeekProgress
          data={data}
          weekStats={weekStats}
          weekDays={weekDays}
          todayStr={todayStr}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );
}
