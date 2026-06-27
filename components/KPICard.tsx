interface Props { label: string; value: number | string; danger?: boolean }

export function KPICard({ label, value, danger }: Props) {
  return (
    <div className={`border rounded-lg p-4 ${danger ? 'border-danger bg-danger-light' : 'border-gray-200 bg-white'}`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${danger ? 'text-danger' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
