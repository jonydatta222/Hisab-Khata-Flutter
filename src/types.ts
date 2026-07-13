export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  product: string;
  amount: number;
  isCash: boolean; // true = cash sale/deposit, false = due (baki) sale
  customer: string; // customer name for due sales
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  description: string;
  amount: number;
}

export interface DailySummary {
  totalSales: number;
  cashDeposit: number;
  totalDue: number;
  todayExpense: number;
}

export interface CustomerDue {
  name: string;
  amount: number;
  lastDate?: string;
  lastTime?: string;
}

export interface OutOfStockItem {
  id: string;
  name: string;
  dateAdded: string; // YYYY-MM-DD
}

export interface ProductRateItem {
  id: string;
  name: string;
  buyingPrice: number;
  dateAdded: string; // YYYY-MM-DD
  keywords?: string;
}

export interface MemoItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  total: number;
  unit: string;
}


