export function fmtTime(iso: string): string {
  // Uses browser local time — correct when running in UTC+7 (TH); for SSR safety use toLocaleTimeString with tz option
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
}
