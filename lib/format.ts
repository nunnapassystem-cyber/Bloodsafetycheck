export function fmtTime(iso: string): string {
  // Local TH timezone display (UTC+7); Supabase stores UTC, getHours reflects server-side offset
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
}
