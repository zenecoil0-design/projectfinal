/** Calendar age using the reference Date's local day; never parse a date-only value as UTC. */
export function calculateAge(birthday: string, referenceDate: Date): number | null {
  if (birthday.length !== 10) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
  if (!match || !Number.isFinite(referenceDate.getTime())) return null;

  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) return null;

  let age = referenceDate.getFullYear() - year;
  const currentMonth = referenceDate.getMonth() + 1;
  // For a Feb 29 birthday, Feb 28 in a non-leap year is still before the birthday.
  // The anniversary therefore advances on March 1, matching the existing rule.
  if (currentMonth < month || (currentMonth === month && referenceDate.getDate() < day)) age--;
  return age < 0 ? null : age;
}
