'use client';

const DEFAULT_PILLS = [
  { id: 'all', label: 'All', countKey: 'all' },
  { id: 'active', label: 'Active', countKey: 'active' },
  { id: 'inactive', label: 'Inactive', countKey: 'inactive' },
];

export default function StatusFilterPills({ value, onChange, counts, pills: pillConfig }) {
  const pills = (pillConfig || DEFAULT_PILLS).map((p) => ({
    id: p.id,
    label: p.label,
    count: counts[p.countKey] ?? 0,
  }));

  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((pill) => (
        <button
          key={pill.id}
          type="button"
          onClick={() => onChange(pill.id)}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
            value === pill.id
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-200 hover:text-primary-700'
          }`}
        >
          {pill.label}
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full ${
              value === pill.id ? 'bg-white/20' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {pill.count}
          </span>
        </button>
      ))}
    </div>
  );
}
