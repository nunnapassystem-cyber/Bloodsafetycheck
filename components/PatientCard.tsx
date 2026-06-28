import type { PatientData } from '@/types'

interface Props { patient: PatientData; bloodGroup?: string }

export function PatientCard({ patient, bloodGroup }: Props) {
  return (
    <div className="border border-primary rounded-lg overflow-hidden">
      <div className="bg-primary-light px-4 py-2 border-b border-primary">
        <span className="text-xs font-medium text-primary">ข้อมูลผู้ป่วย (Session Only)</span>
      </div>
      <div className="p-4 space-y-3">
        {patient.name ? (
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500">ชื่อ-สกุล</span>
            <span className="text-base font-semibold text-gray-900">{patient.name}</span>
          </div>
        ) : (
          <div className="bg-warning-light border border-warning rounded p-3">
            <p className="text-xs font-medium text-warning">กรุณายืนยันชื่อผู้ป่วยจากป้ายข้อมือและให้ผู้ป่วยยืนยันตัว</p>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-gray-500">HN</span>
          <span className="font-mono text-sm font-semibold text-gray-900">{patient.wristbandId}</span>
        </div>
        {bloodGroup && (
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500">Blood Group ผู้ป่วย</span>
            <span className="font-mono text-base font-semibold text-primary">{bloodGroup}</span>
          </div>
        )}
      </div>
    </div>
  )
}
