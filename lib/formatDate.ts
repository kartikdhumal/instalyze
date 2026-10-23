const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function parseIsoDate(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return isNaN(d.getTime()) ? null : d;
}

export function formatChatDate(dateStr: string): string {
  if (!dateStr) return "";

  const d = parseIsoDate(dateStr);
  if (!d) return dateStr;

  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMonthYear(monthStr: string): string {
  if (!monthStr) return "";
  const parts = monthStr.trim().split('/');
  if (parts.length !== 2) return monthStr;

  const [m, y] = parts;
  const d = new Date(`${y}-${m}-02`);
  if (isNaN(d.getTime())) return monthStr;

  return `${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatHour(hourStr: string): string {
  if (!hourStr) return "";
  const hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return hourStr;

  const ampm = hour >= 12 ? 'PM' : 'AM';
  let h = hour % 12;
  if (h === 0) h = 12;

  const hStr = h.toString().padStart(2, '0');
  return `${hStr} ${ampm}`;
}
