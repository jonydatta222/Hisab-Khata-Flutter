/**
 * Converts English numbers/digits (including decimals) to Bangla digits.
 */
export function toBanglaNumber(input: string | number): string {
  const str = String(input);
  const engDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const bngDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  
  let result = str;
  for (let i = 0; i < engDigits.length; i++) {
    result = result.replace(new RegExp(engDigits[i], 'g'), bngDigits[i]);
  }
  return result;
}

/**
 * Returns a nicely formatted date string in English or Bangla.
 */
export function formatDate(dateStr: string, isBangla: boolean): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const bnMonths = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
  
  const dateObj = new Date(parseInt(year, 10), monthIdx, day);
  const dayIdx = dateObj.getDay(); // 0 is Sunday, 1 is Monday...
  
  const enDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bnDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  
  const dayName = isBangla ? bnDays[dayIdx] : enDays[dayIdx];
  const monthName = isBangla ? bnMonths[monthIdx] : enMonths[monthIdx];
  
  if (isBangla) {
    return `${dayName}, ${toBanglaNumber(day)} ${monthName}, ${toBanglaNumber(year)}`;
  } else {
    return `${dayName}, ${day} ${monthName}, ${year}`;
  }
}

/**
 * Converts standard 12h time string format for localization
 */
export function formatTimeStr(timeStr: string, isBangla: boolean): string {
  if (!isBangla) return timeStr;
  
  let result = timeStr;
  result = result.replace('AM', 'এএম');
  result = result.replace('PM', 'পিএম');
  return toBanglaNumber(result);
}

/**
 * Get current date string formatted as YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format currency with appropriate symbol (৳) and locale digits
 */
export function formatCurrency(amount: number, isBangla: boolean): string {
  const fixed = amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `৳ ${isBangla ? toBanglaNumber(fixed) : fixed}`;
}

/**
 * Generates a simple safe unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}
