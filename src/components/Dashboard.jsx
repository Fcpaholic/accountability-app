import { getWeekStart, getWeekDays, shortLabel } from '../lib/dates.js';
import { getWeekStats } from '../lib/calculations.js';
import TodayPanel from './TodayPanel.jsx';
import WeekProgress from './WeekProgress.jsx';

export default function Dashboard({ data, onRefresh, todayStr, showToast }) {
  const weekStart = getWeekStart(todayStr);
  const weekDays = getWeekDays(weekStart);
  const weekStats = getWeekStats(weekDays, data.days || {});

  return (
    <div className="space-y-6">
      {/* Mobile: stack vertically. Desktop: side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodayPanel
          data={data}
          onRefresh={onRefresh}
          todayStr={todayStr}
          showToast={showToast}
        />
        <WeekProgress
          data={data}
          weekStats={weekStats}
          weekDays={weekDays}
          todayStr={todayStr}
        />
      </div>
    </div>
  );
}
