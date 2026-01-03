
export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'upi' | 'bank' | 'credit_card';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  syncToken: string;
}

export interface Account {
  id: string;
  name: string;
  icon: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // ISO string
  amount: number;
  category: string;
  type: TransactionType;
  method: PaymentMethod;
  description: string;
  isRecurring?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  cashBalance: number;
  digitalBalance: number; // UPI + Bank
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  TRANSACTIONS = 'TRANSACTIONS',
  ADD_ENTRY = 'ADD_ENTRY',
  ASSISTANT = 'ASSISTANT',
  ACCOUNTS = 'ACCOUNTS',
  PROFILE = 'PROFILE',
}
