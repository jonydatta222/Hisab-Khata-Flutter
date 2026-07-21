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
 * Converts Bangla numbers/digits to English digits.
 */
export function toEnglishNumber(input: string | number): string {
  const str = String(input);
  const engDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const bngDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  
  let result = str;
  for (let i = 0; i < bngDigits.length; i++) {
    result = result.replace(new RegExp(bngDigits[i], 'g'), engDigits[i]);
  }
  return result;
}

/**
 * Returns a nicely formatted date string in English or Bangla.
 */
export function formatDate(dateStr: string, isBangla: boolean, excludeDay: boolean = false): string {
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
  
  if (excludeDay) {
    if (isBangla) {
      return `${toBanglaNumber(day)} ${monthName}, ${toBanglaNumber(year)}`;
    } else {
      return `${day} ${monthName}, ${year}`;
    }
  }
  
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
  
  // Keep AM and PM in English format as requested
  return toBanglaNumber(timeStr);
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
 * Format currency with appropriate symbol (৳ or $) and locale digits
 */
export function formatCurrency(amount: number, isBangla: boolean): string {
  const fixed = amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `${isBangla ? '৳' : '$'} ${isBangla ? toBanglaNumber(fixed) : fixed}`;
}

/**
 * Generates a simple safe unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

/**
 * Converts date string (YYYY-MM-DD) and 12h time string (HH:MM AM/PM) to milliseconds timestamp.
 */
export function getTimestamp(dateStr: string, timeStr?: string): number {
  if (!dateStr) return 0;
  
  if (!timeStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
  }
  
  // Parse timeStr like "03:45 PM" or "11:15 AM"
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
  }
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, hours, minutes).getTime();
}

/**
 * Checks if a transaction is a due repayment/deposit (not a product sale).
 */
export function isTransactionRepayment(tx: { product: string; isCash: boolean; customer?: string }): boolean {
  if (!tx) return false;
  const prodLower = (tx.product || '').toLowerCase().trim();
  const isRepayment = (tx.isCash && tx.customer && tx.customer.trim().length > 0) ||
                      prodLower.startsWith('বাকি টাকা জমা') || 
                      prodLower.startsWith('বাকির টাকা জমা') || 
                      prodLower.includes('due deposit') ||
                      prodLower.includes('বাকি পরিশোধ') ||
                      prodLower.includes('due paid');
  return !!isRepayment;
}

/**
 * Returns the correct base URL for verification links.
 * Fallback to public web domains if running on localhost, Capacitor, or other local dev environments.
 */
export function getVerificationBaseUrl(): string {
  // Always point public verification links to the public pre-release / shared app URL
  // so that customers scanning the QR code from any device/browser can view the invoice
  // without encountering Google AI Studio 403 login errors.
  return 'https://ais-pre-ubhqkvzgdwmiuzrvrwvhgc-273317504244.asia-southeast1.run.app';
}


