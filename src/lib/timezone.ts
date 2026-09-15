/**
 * Timezone and Age Calculation Utilities for Indian Standard Time (Asia/Kolkata, UTC+5:30)
 * Reference Timezone: Asia/Kolkata
 */

export interface ISTDateParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

/**
 * Returns the current date parts (year, month, day) in the Asia/Kolkata timezone.
 * Uses Intl.DateTimeFormat to reliably determine the current Indian date
 * regardless of the server or client machine's local timezone.
 */
export function getCurrentISTDate(customDate?: Date): ISTDateParts {
  const date = customDate || new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  let year = 0;
  let month = 0;
  let day = 0;

  for (const part of parts) {
    if (part.type === 'year') {
      year = parseInt(part.value, 10);
    } else if (part.type === 'month') {
      month = parseInt(part.value, 10);
    } else if (part.type === 'day') {
      day = parseInt(part.value, 10);
    }
  }

  return { year, month, day };
}

/**
 * Returns today's date in Asia/Kolkata as a YYYY-MM-DD string.
 * Used for HTML5 date picker max constraints.
 */
export function getTodayISTDateString(customDate?: Date): string {
  const { year, month, day } = getCurrentISTDate(customDate);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Calculates a patient's exact age in years based on Date of Birth (YYYY-MM-DD)
 * and the current date in Asia/Kolkata (IST = UTC+5:30).
 *
 * Rules:
 * - Checks birth year, birth month, and birth day.
 * - Checks whether the birthday has already occurred in the current year.
 * - Example:
 *     DOB: 2000-09-15 (15 September 2000)
 *     If current Indian date is 2026-09-13: Age = 25
 *     On 2026-09-15: Age = 26
 *
 * @param dobString - Date of birth in YYYY-MM-DD format
 * @param referenceDate - Optional Date for testing / mock verification
 * @returns number (age in full years) or null if invalid/future DOB
 */
export function calculateAgeInIST(dobString: string, referenceDate?: Date): number | null {
  if (!dobString || typeof dobString !== 'string') {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobString.trim());
  if (!match) {
    return null;
  }

  const birthYear = parseInt(match[1], 10);
  const birthMonth = parseInt(match[2], 10); // 1-12
  const birthDay = parseInt(match[3], 10);   // 1-31

  if (birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > 31) {
    return null;
  }

  const currentIST = getCurrentISTDate(referenceDate);

  // Check if birth date is in the future
  if (
    birthYear > currentIST.year ||
    (birthYear === currentIST.year && birthMonth > currentIST.month) ||
    (birthYear === currentIST.year && birthMonth === currentIST.month && birthDay > currentIST.day)
  ) {
    return null;
  }

  let age = currentIST.year - birthYear;

  // If birthday has not occurred yet this year in IST, subtract 1
  if (
    currentIST.month < birthMonth ||
    (currentIST.month === birthMonth && currentIST.day < birthDay)
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}
