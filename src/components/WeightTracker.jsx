import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { setWeight } from '../lib/storage.js';
import { shortLabel, today } from '../lib/dates.js';
import { getWeightChartData } from '../lib/calculations.js';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl">
        <p className="text-zinc-400">{label}</p>
        <p className="text-emerald-400 font-bold text-sm">{payload[0].value} kg</p>
      </div>
    );
  }
  return null;
};

export default function WeightTracker({ data, onRefresh, todayStr, showToast }) {
  const dayData = (data.days || {})[todayStr] || {};
  const [weightInput, setWeightInput] = useState(
    dayData.weight !== null && dayData.weight !== undefined ? String(dayData.weight) : ''
  );

  const chartData = getWeightChartData(data);
  const hasData = chartData.length > 0;

  const firstWeight = hasData ? chartData[0].weight : null;
  const lastWeight = hasData ? chartData[chartData.length - 1].weight : null;
  const totalLoss = firstWeight && lastWeight ? Math.round((firstWeight - lastWeight) * 10) / 10 : null;

  const yDomain = hasData
    ? [
        Math.floor(Math.min(...chartData.map((d) => d.weight)) - 1),
        Math.ceil(Math.max(...chartData.map((d) => d.weight)) + 1),
      ]
    : ['auto', 'auto'];

  const handleSave = (val) => {
    const num = Number(val);
    if (!val || isNaN(num) || num <= 0) return;
    onRefresh(setWeight(todayStr, num));
    showToast(`Weight logged: ${num} kg`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Log today's weight */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Log Today's Weight
        </h2>
        <p className="text-sm text-zinc-400 mb-4">{shortLabel(todayStr)}</p>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-1.5">Weight (kg)</label>
            <input
              type="number"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              onBlur={(e) => handleSave(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave(weightInput)}
              placeholder="e.g. 82.5"
              step="0.1"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>
          {dayData.weight !== null && dayData.weight !== undefined && (
            <div className="bg-emerald-950 border border-emerald-800 rounded-lg px-4 py-2.5">
              <span className="text-emerald-400 font-bold">{dayData.weight} kg</span>
              <span className="text-zinc-500 text-xs ml-1">logged</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats summary */}
      {hasData && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Start weight" value={`${firstWeight} kg`} />
          <StatCard label="Current weight" value={`${lastWeight} kg`} />
          <StatCard
            label="Total change"
            value={totalLoss !== null ? `${totalLoss > 0 ? '-' : '+'}${Math.abs(totalLoss)} kg` : '—'}
            color={totalLoss > 0 ? 'text-emerald-400' : totalLoss < 0 ? 'text-red-400' : 'text-zinc-300'}
          />
        </div>
      )}

      {/* Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
          Weight Trend
        </h2>

        {!hasData ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-zinc-600 text-sm">No weight data yet. Start logging above.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={yDomain}
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}`}
                width={35}
              />
              <Tooltip content={<CustomTooltip />} />
              {firstWeight && (
                <ReferenceLine
                  y={firstWeight}
                  stroke="#3f3f46"
                  strokeDasharray="4 4"
                  label={{ value: 'Start', fill: '#71717a', fontSize: 10, position: 'right' }}
                />
              )}
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Weight log table */}
      {hasData && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Log History
          </h2>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {[...chartData].reverse().map((entry) => {
              const prev = chartData.find((e, i) => chartData[i + 1]?.date === entry.date);
              const change = prev ? Math.round((entry.weight - prev.weight) * 10) / 10 : null;
              return (
                <div
                  key={entry.date}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                    entry.date === todayStr ? 'bg-zinc-800 border border-zinc-700' : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <span className="text-sm text-zinc-400">
                    {shortLabel(entry.date)}
                    {entry.date === todayStr && (
                      <span className="ml-2 text-xs text-emerald-500">today</span>
                    )}
                  </span>
                  <div className="flex items-center gap-3">
                    {change !== null && (
                      <span
                        className={`text-xs ${
                          change < 0 ? 'text-emerald-500' : change > 0 ? 'text-red-400' : 'text-zinc-600'
                        }`}
                      >
                        {change > 0 ? '+' : ''}{change} kg
                      </span>
                    )}
                    <span className="text-sm font-semibold text-white">{entry.weight} kg</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
