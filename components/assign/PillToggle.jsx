'use client';
// Equal-width toggle buttons. The selected one is a full white pill on a grey track (no measured indicator, so it never mis-sizes inside modals).
const PillToggle = ({ value, onChange, data }) => (
    <div className="grid gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }} role="tablist">
        {data.map((o) => {
            const active = o.value === value;
            return (
                <button
                    key={o.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onChange(o.value)}
                    className={`min-h-[36px] rounded-md px-2 py-1.5 text-center text-sm font-medium transition-colors ${
                        active ? 'bg-white text-black shadow dark:bg-gray-600 dark:text-white' : 'text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white'
                    }`}
                >
                    {o.label}
                </button>
            );
        })}
    </div>
);

export default PillToggle;
