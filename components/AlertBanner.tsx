interface Props {
  type: 'danger' | 'success' | 'warning'
  title: string
  message?: string
}

const STYLES = {
  danger:  { wrap: 'bg-danger-light border-danger',   text: 'text-danger',  icon: '❌' },
  success: { wrap: 'bg-success-light border-success',  text: 'text-success', icon: '✅' },
  warning: { wrap: 'bg-warning-light border-warning',  text: 'text-warning', icon: '⚠️' },
}

export function AlertBanner({ type, title, message }: Props) {
  const s = STYLES[type]
  return (
    <div className={`border rounded-lg p-4 ${s.wrap}`}>
      <p className={`text-base font-semibold ${s.text}`}>{s.icon} {title}</p>
      {message && <p className="text-sm text-gray-700 mt-1">{message}</p>}
    </div>
  )
}
