export default function StatCard({ label, value, sub, tone = 'blue', icon }) {
  const tones = {
    blue: 'from-blue-500/10 text-blue-600',
    green: 'from-emerald-500/10 text-emerald-600',
    amber: 'from-amber-500/10 text-amber-600',
    red: 'from-red-500/10 text-red-600',
    violet: 'from-violet-500/10 text-violet-600',
  };
  return (
    <div className={`rounded-xl border border-gray-200 bg-gradient-to-br ${tones[tone].split(' ')[0]} to-white p-3 dark:border-gray-700 dark:to-transparent sm:p-4`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        {icon && <span className={tones[tone].split(' ')[1]}>{icon}</span>}
      </div>
      <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}
