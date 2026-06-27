interface Props {
  currentStep: 1 | 2 | 3
}

const STEPS = [
  { n: 1, label: 'Scan ถุงเลือด' },
  { n: 2, label: 'Scan ป้ายข้อมือ' },
  { n: 3, label: 'ยืนยัน 2 พยาบาล' },
] as const

export function StepIndicator({ currentStep }: Props) {
  return (
    <div className="flex items-start gap-0 mb-6">
      {STEPS.map((step, idx) => {
        const done = step.n < currentStep
        const active = step.n === currentStep
        return (
          <div key={step.n} className="flex items-start flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors
                ${done ? 'bg-success border-success text-white' : ''}
                ${active ? 'bg-primary border-primary text-white' : ''}
                ${!done && !active ? 'bg-white border-gray-200 text-gray-400' : ''}
              `}>
                {done ? '✓' : step.n}
              </div>
              <span className={`text-xs mt-1 text-center leading-tight ${active ? 'text-primary font-medium' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 w-6 mt-3.5 ${done ? 'bg-success' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
