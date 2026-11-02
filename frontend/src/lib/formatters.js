export function formatINR(num) {
  const n = Number(num) || 0;
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatShortDate(isoDate) {
  if (!isoDate) return "22 Oct '26";
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const y = parts[0].slice(2);
  const m = months[parseInt(parts[1], 10) - 1] || 'Oct';
  const d = parseInt(parts[2], 10);
  return `${d} ${m} '${y}`;
}

export function format12HourTime(timeStr) {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${mStr || '00'} ${ampm}`;
}

export function getNowDateString() {
  return '2026-10-22';
}

export function getNowTimeString() {
  return '22:25';
}
