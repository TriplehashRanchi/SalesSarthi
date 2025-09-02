// utils/date.js
export function daysUntil(dateString) {
  if (!dateString) return null;
  const end = new Date(dateString);
  if (isNaN(end)) return null;

  // Count until end-of-day in IST so it matches what users expect
  const endOfDay = new Date(end);
  endOfDay.setHours(23, 59, 59, 999);

  const now = new Date();
  const diffMs = endOfDay.getTime() - now.getTime();
  return Math.ceil(diffMs / 86400000); // 1 day = 86,400,000 ms
}

export function formatIST(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}
