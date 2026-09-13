export function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function nextTenAmLocal(weekdaysOnly = false) {
  const now = new Date();
  const todayTen = new Date(now);
  todayTen.setHours(10, 0, 0, 0);
  const next = now < todayTen ? todayTen : new Date(todayTen.getTime() + 86_400_000);
  next.setHours(10, 0, 0, 0);
  if (weekdaysOnly) {
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
      next.setHours(10, 0, 0, 0);
    }
  }
  return toLocalInput(next);
}
