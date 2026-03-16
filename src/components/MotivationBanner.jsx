import { getMotivationMessage } from '../lib/calculations.js';

const TYPE_STYLES = {
  danger: 'bg-red-950/80 border-red-800 text-red-200',
  warning: 'bg-amber-950/80 border-amber-800 text-amber-200',
  success: 'bg-emerald-950/80 border-emerald-800 text-emerald-200',
  info: 'bg-zinc-900 border-zinc-700 text-zinc-300',
};

const TYPE_ICONS = {
  danger: '⚠',
  warning: '⚡',
  success: '✓',
  info: '→',
};

export default function MotivationBanner({ data, todayStr }) {
  const { type, msg } = getMotivationMessage(data, todayStr);

  return (
    <div className={`border-b ${TYPE_STYLES[type]}`}>
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-2">
        <span className="font-bold text-sm shrink-0">{TYPE_ICONS[type]}</span>
        <p className="text-sm font-medium">{msg}</p>
      </div>
    </div>
  );
}
