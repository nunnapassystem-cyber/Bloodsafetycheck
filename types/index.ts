export interface TransfusionLog {
  id: string
  created_at: string
  ward_id: string
  wristband_id: string
  blood_bag_id: string
  blood_component: 'PRC' | 'LPRC' | 'FFP' | 'PC' | 'LDPPC' | 'LPPC' | 'SDP' | 'CRYO' | 'LDPRC' | 'LPRC-N' | 'CRP'
  blood_group_bag: string
  match_result: 'PASS' | 'FAIL'
  alert_reason: string | null
  nurse_1_name: string
  nurse_2_name: string
  started_at: string
}

export interface BloodBagData {
  id: string
  component: 'PRC' | 'LPRC' | 'FFP' | 'PC' | 'LDPPC' | 'LPPC' | 'SDP' | 'CRYO' | 'LDPRC' | 'LPRC-N' | 'CRP'
  bloodGroup: string
  volumeMl: number
}

export interface PatientData {
  wristbandId: string
  name: string
}

export interface UserProfile {
  id: string
  email: string
  wardId: string
  wardName: string
  nurseName: string
  role: 'nurse' | 'head_nurse' | 'admin'
}
