export interface Ward {
  id: string
  name: string
}

export const WARDS: Ward[] = [
  { id: 'ward-A', name: 'ศัลยกรรมชาย' },
  { id: 'ward-B', name: 'ศัลยกรรมหญิง' },
  { id: 'ward-C', name: 'อายุรกรรมชาย' },
  { id: 'ward-D', name: 'กุมารเวชกรรม' },
  { id: 'ward-E', name: 'สูติกรรม' },
  { id: 'ward-F', name: 'อายุรกรรมหญิง' },
  { id: 'ward-G', name: 'วิกฤตศัลยกรรม' },
  { id: 'ward-H', name: 'วิกฤตอายุรกรรม' },
  { id: 'ward-I', name: 'วิกฤตอุบัติเหตุและหัวใจ' },
  { id: 'ward-J', name: 'ห้องผ่าตัดศัลยกรรม' },
  { id: 'ward-K', name: 'ห้องผ่าตัดสูติกรรม' },
  { id: 'admin', name: 'ผู้ดูแลระบบ' },
]
