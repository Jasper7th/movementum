export function toLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addLocalDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return toLocalDateKey(new Date(year, month - 1, day + days, 12));
}

export function startOfLocalWeek(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return toLocalDateKey(new Date(year, month - 1, day - daysSinceMonday, 12));
}

export function localDateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function monthKeyFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function addLocalMonths(monthKey: string, months: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + months, 1, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthDateKeys(monthKey: string): string[] {
  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0, 12).getDate();
  return Array.from({ length: daysInMonth }, (_, index) =>
    `${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`,
  );
}

/** Monday-first month grid. Null entries are visual padding outside the displayed month. */
export function getMonthCalendarGrid(monthKey: string): Array<string | null> {
  const dates = getMonthDateKeys(monthKey);
  const firstWeekday = localDateFromKey(dates[0]).getDay();
  const leadingCells = (firstWeekday + 6) % 7;
  const cells: Array<string | null> = [...Array.from({ length: leadingCells }, () => null), ...dates];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
