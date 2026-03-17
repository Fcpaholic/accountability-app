import {
  WEEKLY_KM_TARGET,
  WEEKLY_GYM_TARGET,
  CHALLENGE_START,
  CHALLENGE_END,
  isToday,
  getWeekStart,
  weekLabel,
  getWeekCalorieTarget,
} from '../lib/dates.js';
import { getDayStatus } from '../lib/calculations.js';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const STATUS_CELL = {
  future: 'bg-zinc-800/40 text-zinc-700 border-zinc-800',
  empty: 'bg-zinc-800 text-zinc-500 border-zinc-700',
  perfect: 'bg-emerald-600 text-white border-emerald-500 glow-green',
  deficit: 'bg-emerald-900 text-emerald-300 border-emerald-800',
  active: 'bg-sky-900 text-sky-300 border-sky-800',
  warning: 'bg-amber-900 text-amber-300 border-amber-800',
  surplus: 'bg-red-900 text-red-300 border-red-800',
  partial: 'bg-zinc-700 text-zinc-400 border-zinc-600',
};

function ProgressBar({ value, max, color = 'bg-emerald-500', className = '' }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className={`h-2 bg-zinc-800 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${color} ${
          pct >= 100 ? 'glow-green' : ''
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function GymPips({ count, target }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: target }).map((_, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-sm border transition-all duration-300 ${
            i < count
              ? 'bg-emerald-500 border-emerald-400'
              : 'bg-zinc-800 border-zinc-700'
          }`}
        />
      ))}
    </div>
  );
}

export default function WeekProgress({ data, weekStats, weekDays, todayStr, selectedDate }) {
  const allDays = data.days || {};
  const activeDate = selectedDate || todayStr;
  const ws = getWeekStart(activeDate);

  const kmLeft = Math.max(0, WEEKLY_KM_TARGET - weekStats.km);
  const gymLeft = Math.max(0, WEEKLY_GYM_TARGET - weekStats.gymSessions);
  const { target: calorieTarget, label: protocolLabel, isDietBreak } = getWeekCalorieTarget(activeDate);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">This Week</h2>
          <p className="text-sm font-medium text-zinc-300 mt-0.5">{weekLabel(ws)}</p>
        </div>
        <div className={`text-right text-xs px-2 py-1 rounded-md border ${
          isDietBreak ? 'bg-violet-950 border-violet-800 text-violet-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
        }`}>
          <div className="font-semibold">{calorieTarget} kcal</div>
          <div className="text-[10px] opacity-70">{protocolLabel}</div>
        </div>
      </div>

      {/* Day indicators */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, i) => {
          const status = getDayStatus(day, allDays);
          const isCurrentDay = day === activeDate;
          const inChallenge = day >= CHALLENGE_START && day <= CHALLENGE_END;

          return (
            <div key={day} className="flex flex-col items-center gap-1">
              <span className="text-xs text-zinc-600">{DAY_LETTERS[i]}</span>
              <div
                className={`w-8 h-8 rounded-md border text-xs flex items-center justify-center font-medium transition-all ${
                  STATUS_CELL[inChallenge ? status : 'future']
                } ${isCurrentDay ? 'ring-2 ring-white/30' : ''}`}
              >
                {day.slice(8)} {/* day number */}
              </div>
            </div>
          );
        })}
      </div>

      {/* Running progress */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <span>🏃</span>
            <span className="font-medium text-zinc-300">Running</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`font-bold ${weekStats.kmDone ? 'text-emerald-400' : 'text-white'}`}>
              {weekStats.km.toFixed(1)}
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">{WEEKLY_KM_TARGET} km</span>
            {weekStats.kmDone && <span className="text-emerald-400">✓</span>}
          </div>
        </div>
        <ProgressBar value={weekStats.km} max={WEEKLY_KM_TARGET} />
        {!weekStats.kmDone && (
          <p className="text-xs text-zinc-500">{kmLeft.toFixed(1)} km remaining</p>
        )}
      </section>

      {/* Gym progress */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <span>🏋</span>
            <span className="font-medium text-zinc-300">Gym</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`font-bold ${weekStats.gymDone ? 'text-emerald-400' : 'text-white'}`}>
              {weekStats.gymSessions}
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">{WEEKLY_GYM_TARGET} sessions</span>
            {weekStats.gymDone && <span className="text-emerald-400">✓</span>}
          </div>
        </div>
        <GymPips count={weekStats.gymSessions} target={WEEKLY_GYM_TARGET} />
        {!weekStats.gymDone && (
          <p className="text-xs text-zinc-500">{gymLeft} session{gymLeft !== 1 ? 's' : ''} remaining</p>
        )}
      </section>

      {/* Nutrition progress */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <span>{isDietBreak ? '🧬' : '🥗'}</span>
            <span className="font-medium text-zinc-300">
              {isDietBreak ? 'Maintenance days' : 'Deficit days'}
            </span>
            <span className="text-xs text-zinc-600">≤{calorieTarget}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white">{weekStats.deficitDays}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">7</span>
          </div>
        </div>
        <ProgressBar
          value={weekStats.deficitDays}
          max={7}
          color={
            weekStats.deficitDays >= 6
              ? 'bg-emerald-500'
              : weekStats.deficitDays >= 4
              ? 'bg-amber-500'
              : 'bg-red-500'
          }
        />
      </section>

      {/* Week score */}
      {weekStats.loggedDays > 0 && (
        <div className="pt-1 border-t border-zinc-800">
          <WeekScore weekStats={weekStats} />
        </div>
      )}
    </div>
  );
}

function WeekScore({ weekStats }) {
  // Simple week score: how close to goal
  const kmScore = Math.min(weekStats.km / WEEKLY_KM_TARGET, 1) * 40;
  const gymScore = Math.min(weekStats.gymSessions / WEEKLY_GYM_TARGET, 1) * 40;
  const nutritionScore = (weekStats.deficitDays / 7) * 20;
  const total = Math.round(kmScore + gymScore + nutritionScore);

  const color =
    total >= 80 ? 'text-emerald-400' : total >= 55 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500">Week score</span>
      <span className={`text-sm font-bold ${color}`}>{total}%</span>
    </div>
  );
}
