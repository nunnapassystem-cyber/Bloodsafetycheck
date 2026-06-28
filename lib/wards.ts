export interface Ward {
  id: string
  name: string
}

export const WARDS: Ward[] = [
  { id: 'ward-A', name: 'ศัลยกรรมชาย' },
  { id: 'ward-B', name: 'ศัลยกรรมหญิง' },
  { id: 'ward-C', name: 'อายุรกรรม' },
  { id: 'ward-D', name: 'กุมารเวชกรรม' },
  { id: 'ward-E', name: 'สูติกรรม' },
  { id: 'admin', name: 'ผู้ดูแลระบบ' },
]
