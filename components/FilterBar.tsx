interface Props {
  date: string
  onDateChange: (d: string) => void
  result: 'all' | 'PASS' | 'FAIL'
  onResultChange: (r: 'all' | 'PASS' | 'FAIL') => void
  count: number
}

export function FilterBar({ date, onDateChange, result, onResultChange, count }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <input
        type="date"
        value={date}
        onChange={e => onDateChange(e.target.value)}
        className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
      />
      <div className="flex gap-1">
        {(['all', 'PASS', 'FAIL'] as const).map(r => (
          <button
            key={r}
            onClick={() => onResultChange(r)}
            className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors
              ${result === r
                ? r === 'FAIL' ? 'bg-danger text-white border-danger'
                  : r === 'PASS' ? 'bg-success text-white border-success'
                  : 'bg-primary text-white border-primary'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
          >
            {r === 'all' ? 'ทั้งหมด' : r}
          </button>
        ))}
      </div>
      <span className="text-xs text-gray-500">ทั้งหมด {count} รายการ</span>
    </div>
  )
}
