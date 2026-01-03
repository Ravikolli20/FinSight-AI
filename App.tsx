
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';

/** * ==========================================
 * TYPES & CONSTANTS
 * ==========================================
 */

// Safely access environment variables to prevent build errors in preview environments
const getApiBase = () => {
  try {
    // Check if we are in a Vite environment
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
  } catch (e) {
    // Fallback if import.meta is not supported by the bundler
  }
  return 'https://finsight-ai-o51v.onrender.com/api';
};


const API_BASE = getApiBase();
const USER_SESSION_KEY = 'smartfinance_current_user';
const TOKEN_KEY = 'smartfinance_access_token';

type TransactionType = 'income' | 'expense';
type PaymentMethod = 'cash' | 'upi' | 'bank' | 'credit_card';

interface User {
  id: string;
  name: string;
  email: string;
  syncToken: string;
}

interface Account {
  id: string;
  name: string;
  icon: string;
}

interface Transaction {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  category: string;
  type: TransactionType;
  method: PaymentMethod;
  description: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

enum AppView {
  DASHBOARD = 'DASHBOARD',
  TRANSACTIONS = 'TRANSACTIONS',
  ADD_ENTRY = 'ADD_ENTRY',
  ASSISTANT = 'ASSISTANT',
  ACCOUNTS = 'ACCOUNTS',
  PROFILE = 'PROFILE',
}

/** * ==========================================
 * AI SERVICES
 * ==========================================
 */

const apiKey = ""; 

const callGemini = async (prompt: string, systemInstruction: string = "") => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
        })
      }
    );
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    return "I'm having trouble connecting to my brain right now. Please try again.";
  }
};

/** * ==========================================
 * COMPONENTS
 * ==========================================
 */

// --- Login Component ---
const Login: React.FC<{ onLogin: (u: User, t: string) => void; apiBase: string; }> = ({ onLogin, apiBase }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const endpoint = isSignUp ? `${apiBase}/register` : `${apiBase}/login`;
    const body = isSignUp ? { email, name, password } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) onLogin(data.user, data.token);
      else setError(data.error || 'Auth failed');
    } catch (err) {
      setError(`Connection failed. The backend at ${apiBase} might be waking up (Cold Start). Please wait 30s and try again.`);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center p-4 z-[100]">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 text-3xl">💎</div>
          <h1 className="text-2xl font-bold text-white">SmartFinance</h1>
          <p className="text-gray-400 text-sm mt-1">Secure AI Wealth Management</p>
        </div>
        {error && <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-3 rounded-xl text-xs mb-4 text-center whitespace-pre-wrap">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" required />}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" required />
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-all flex justify-center items-center gap-2">
            {loading ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        <p className="mt-8 text-center text-gray-400 text-sm">
          {isSignUp ? 'Already have an account?' : "New here?"}
          <button onClick={() => setIsSignUp(!isSignUp)} className="ml-2 text-emerald-400 font-bold">{isSignUp ? 'Sign In' : 'Sign Up Free'}</button>
        </p>
      </div>
    </div>
  );
};

// --- Sidebar ---
const Sidebar: React.FC<{ currentView: AppView; onChangeView: (v: AppView) => void; user: User; onLogout: () => void; }> = ({ currentView, onChangeView, user, onLogout }) => {
  const navItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: '📊' },
    { id: AppView.ADD_ENTRY, label: 'Add Entry', icon: '➕' },
    { id: AppView.TRANSACTIONS, label: 'Transactions', icon: '🧾' },
    { id: AppView.ACCOUNTS, label: 'Accounts', icon: '🏦' },
    { id: AppView.ASSISTANT, label: 'AI Assistant', icon: '🤖' },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full h-16 bg-gray-900 border-t border-gray-800 md:relative md:w-64 md:h-screen md:border-t-0 md:border-r border-gray-800 flex md:flex-col z-50">
      <div className="hidden md:flex items-center justify-center h-20 border-b border-gray-800">
        <h1 className="text-xl font-bold text-emerald-400 tracking-wider">SmartFinance</h1>
      </div>
      <nav className="flex-1 flex md:flex-col justify-around md:justify-start md:p-4 gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`flex flex-col md:flex-row items-center md:px-4 py-2 rounded-lg transition-colors w-full
              ${currentView === item.id ? 'text-emerald-400 bg-gray-800' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
          >
            <span className="text-2xl md:text-lg md:mr-3">{item.icon}</span>
            <span className="text-xs md:text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="hidden md:flex flex-col p-4 border-t border-gray-800 mt-auto">
        <button onClick={() => onChangeView(AppView.PROFILE)} className="flex items-center p-2 rounded-xl transition-all mb-2 hover:bg-gray-800">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold mr-3">{user.name[0].toUpperCase()}</div>
          <div className="text-left overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{user.name}</p>
          </div>
        </button>
        <button onClick={onLogout} className="flex items-center px-4 py-2 text-xs text-gray-500 hover:text-red-400 transition-colors">🚪 Logout Session</button>
      </div>
    </div>
  );
};

// --- Dashboard (Updated with Income vs Expense Chart) ---
const Dashboard: React.FC<{ transactions: Transaction[]; accounts: Account[]; selectedAccountId: string; onSelectAccount: (id: string) => void; }> = ({ transactions, accounts, selectedAccountId, onSelectAccount }) => {
  const filteredTransactions = useMemo(() => 
    selectedAccountId === 'all' ? transactions : transactions.filter(t => t.accountId === selectedAccountId),
  [transactions, selectedAccountId]);
  
  const stats = useMemo(() => {
    let inc = 0, exp = 0;
    filteredTransactions.forEach(t => t.type === 'income' ? inc += t.amount : exp += t.amount);
    return { balance: inc - exp, income: inc, expense: exp };
  }, [filteredTransactions]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      data[t.category] = (data[t.category] || 0) + t.amount;
    });
    return Object.keys(data).map(key => ({ name: key, value: data[key] }));
  }, [filteredTransactions]);

  const comparisonData = useMemo(() => {
    // Aggregating by month for the comparison chart
    const monthlyMap: Record<string, { month: string; income: number; expense: number }> = {};
    
    filteredTransactions.forEach(t => {
      const date = new Date(t.date);
      const monthLabel = date.toLocaleString('default', { month: 'short' });
      
      if (!monthlyMap[monthLabel]) {
        monthlyMap[monthLabel] = { month: monthLabel, income: 0, expense: 0 };
      }
      
      if (t.type === 'income') monthlyMap[monthLabel].income += t.amount;
      else monthlyMap[monthLabel].expense += t.amount;
    });

    return Object.values(monthlyMap);
  }, [filteredTransactions]);

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Financial Dashboard</h2>
          <p className="text-gray-400 text-sm">Real-time spending overview</p>
        </div>
        <select 
          value={selectedAccountId} 
          onChange={e => onSelectAccount(e.target.value)} 
          className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">🏦 All Accounts Combined</option>
          {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.icon} {acc.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><span className="text-4xl">💎</span></div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Net Worth</p>
          <h3 className={`text-4xl font-black mt-2 ${stats.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{stats.balance.toLocaleString()}</h3>
        </div>
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Monthly Revenue</p>
          <h3 className="text-3xl font-bold mt-2 text-white">₹{stats.income.toLocaleString()}</h3>
        </div>
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Monthly Burn</p>
          <h3 className="text-3xl font-bold mt-2 text-red-400">₹{stats.expense.toLocaleString()}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 h-[400px]">
          <h3 className="text-lg font-bold text-white mb-6">Income vs Expenses</h3>
          {comparisonData.length > 0 ? (
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="month" stroke="#9ca3af" axisLine={false} tickLine={false} />
                <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                  contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-full flex items-center justify-center text-gray-600 italic">No trend data available</div>
          )}
        </div>

        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 h-[400px]">
          <h3 className="text-lg font-bold text-white mb-6">Spending Distribution</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                  {categoryData.map((_, i) => <Cell key={i} fill={['#10b981', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6'][i % 5]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '12px', fontSize: '12px' }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-600 italic">No expense data to visualize</div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Add Transaction ---
const AddTransaction: React.FC<{ accounts: Account[]; onAdd: (t: Omit<Transaction, 'id'>) => void; }> = ({ accounts, onAdd }) => {
  const [formData, setFormData] = useState({
    amount: '', description: '', category: 'Food', date: new Date().toISOString().split('T')[0],
    type: 'expense' as TransactionType, method: 'upi' as PaymentMethod, accountId: accounts[0]?.id || ''
  });

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Salary', 'Investment', 'Other'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.accountId) return;
    onAdd({ ...formData, amount: parseFloat(formData.amount) });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 pb-24 md:pb-6">
      <h2 className="text-2xl font-bold text-white">Create New Entry</h2>
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-2xl border border-gray-800 space-y-6 shadow-2xl">
        <div className="flex bg-gray-950 p-1 rounded-xl">
          <button type="button" onClick={() => setFormData({...formData, type: 'income'})} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${formData.type === 'income' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500'}`}>Income</button>
          <button type="button" onClick={() => setFormData({...formData, type: 'expense'})} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${formData.type === 'expense' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-500'}`}>Expense</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Amount</label>
            <input type="number" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-emerald-500" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Account</label>
            <select value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white outline-none">
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.icon} {acc.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
          <input type="text" placeholder="What was this for?" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-emerald-500" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label>
            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white outline-none">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date</label>
            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white outline-none" />
          </div>
        </div>
        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black text-lg transition-all active:scale-[0.98]">Record Transaction</button>
      </form>
    </div>
  );
};

// --- Transaction List (Updated with Export) ---
const TransactionList: React.FC<{ transactions: Transaction[]; accounts: Account[]; onDelete: (id: string) => void; }> = ({ transactions, accounts, onDelete }) => {
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

  const exportToCSV = () => {
    if (transactions.length === 0) return;
    
    const headers = ['Date', 'Description', 'Category', 'Account', 'Type', 'Amount', 'Method'];
    const rows = transactions.map(t => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.category,
      accountMap.get(t.accountId)?.name || 'Deleted Account',
      t.type,
      t.amount,
      t.method
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `SmartFinance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">History</h2>
          <p className="text-gray-500 text-sm">{transactions.length} records found</p>
        </div>
        <button 
          onClick={exportToCSV}
          disabled={transactions.length === 0}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl border border-gray-700 transition-all font-bold text-sm"
        >
          <span>📥</span> Export CSV
        </button>
      </div>
      <div className="space-y-3">
        {transactions.length > 0 ? transactions.map((t) => (
          <div key={t.id} className="bg-gray-900 p-5 rounded-2xl border border-gray-800 flex justify-between items-center group transition-all hover:bg-gray-800/50">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${t.type === 'income' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}>
                {t.type === 'income' ? '💹' : '🛍️'}
              </div>
              <div>
                <h4 className="font-bold text-white text-lg">{t.description}</h4>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md font-bold uppercase">{t.category}</span>
                   <span className="text-xs text-gray-500">{t.date} • {accountMap.get(t.accountId)?.name || 'Account Deleted'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`text-xl font-black ${t.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                {t.type === 'income' ? '+' : '-'} ₹{t.amount.toLocaleString()}
              </span>
              <button 
                onClick={() => { if(confirm("Permanently delete this entry?")) onDelete(t.id); }} 
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-700 hover:text-red-500 hover:bg-red-500/10 transition-all md:opacity-0 md:group-hover:opacity-100"
              >✕</button>
            </div>
          </div>
        )) : (
          <div className="text-center py-20 bg-gray-900 rounded-3xl border border-dashed border-gray-800">
            <span className="text-5xl opacity-20 block mb-4">📭</span>
            <p className="text-gray-500 italic">No financial history recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Manage Accounts ---
const ManageAccounts: React.FC<{ accounts: Account[]; onAddAccount: (n: string, i: string) => void; onDeleteAccount: (id: string) => void; }> = ({ accounts, onAddAccount, onDeleteAccount }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💼');
  const icons = ['💼', '🏦', '💳', '💰', '📉', '🏠', '🚗', '💵'];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddAccount(name, icon);
    setName('');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 pb-24 md:pb-6">
      <h2 className="text-2xl font-bold text-white">Financial Entities</h2>
      <form onSubmit={handleAdd} className="bg-gray-900 p-8 rounded-2xl border border-gray-800 space-y-6 shadow-xl">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Account Name</label>
          <input type="text" placeholder="e.g. HDFC Savings" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-emerald-500" required />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Icon</label>
          <div className="flex flex-wrap gap-2">
            {icons.map(i => (
              <button key={i} type="button" onClick={() => setIcon(i)} className={`w-12 h-12 rounded-xl text-xl flex items-center justify-center transition-all ${icon === i ? 'bg-emerald-600 border-2 border-white scale-110' : 'bg-gray-800 border border-gray-700 hover:bg-gray-700'}`}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" className="w-full bg-emerald-600 py-4 rounded-xl font-bold text-lg hover:bg-emerald-500">Create Account</button>
      </form>
      <div className="space-y-3">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-gray-900 p-5 rounded-2xl border border-gray-800 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span className="text-2xl w-12 h-12 flex items-center justify-center bg-gray-800 rounded-xl">{acc.icon}</span>
              <span className="text-white font-bold text-lg">{acc.name}</span>
            </div>
            {accounts.length > 1 && (
              <button 
                onClick={() => { if(confirm("Are you sure? This will delete ALL associated transactions!")) onDeleteAccount(acc.id); }} 
                className="text-red-500 bg-red-500/10 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition-all"
              >Remove</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Profile ---
const Profile: React.FC<{ user: User; transactionCount: number; onLogout: () => void; }> = ({ user, transactionCount, onLogout }) => (
  <div className="p-6 max-w-2xl mx-auto space-y-6 pb-24 md:pb-6">
    <h2 className="text-2xl font-bold text-white">Identity & Security</h2>
    <div className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
      <div className="h-32 bg-gradient-to-r from-emerald-600 to-emerald-900"></div>
      <div className="px-8 pb-8 relative">
        <div className="absolute -top-12 left-8 w-24 h-24 rounded-2xl bg-gray-900 border-4 border-gray-900 flex items-center justify-center text-5xl text-emerald-400 font-black shadow-2xl">{user.name[0].toUpperCase()}</div>
        <div className="pt-16">
          <h3 className="text-2xl font-bold text-white">{user.name}</h3>
          <p className="text-gray-500 font-medium">{user.email}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800">
            <p className="text-xs text-gray-600 font-black uppercase mb-1">Activity</p>
            <p className="text-3xl font-bold text-white">{transactionCount}</p>
            <p className="text-[10px] text-gray-500 mt-1">Total Logs</p>
          </div>
          <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800">
            <p className="text-xs text-gray-600 font-black uppercase mb-1">Sync ID</p>
            <p className="text-sm font-mono font-bold text-emerald-400 break-all">{user.syncToken}</p>
            <p className="text-[10px] text-gray-500 mt-1">Shared ID</p>
          </div>
        </div>
      </div>
    </div>
    <button onClick={onLogout} className="w-full bg-red-950/30 text-red-500 border border-red-500/20 py-4 rounded-2xl font-black text-lg transition-all hover:bg-red-500 hover:text-white">Sign Out of all devices</button>
  </div>
);

// --- AI Assistant ---
const AIAssistant: React.FC<{ transactions: Transaction[]; accounts: Account[]; }> = ({ transactions, accounts }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: 'Financial Intelligence ready. Ask me anything about your finances.', timestamp: Date.now() }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const prompt = `Financial Context: User has ${accounts.length} accounts. Recent 50 transactions: ${JSON.stringify(transactions.slice(0, 50))}. Question: ${userMsg.text}`;
    const system = "You are a professional financial advisor. Analyze the provided JSON data to answer accurately. Be precise, encouraging, and brief.";
    
    const response = await callGemini(prompt, system);
    setMessages(prev => [...prev, { role: 'model', text: response || "Brain disconnected. Try again later.", timestamp: Date.now() }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen bg-gray-950">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-900 text-gray-100 border border-gray-800 shadow-xl'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-gray-500 animate-pulse font-bold tracking-widest uppercase">AI Analysing...</div>}
        <div ref={scrollRef} />
      </div>
      <form onSubmit={handleSend} className="p-4 md:p-8 bg-gray-900 border-t border-gray-800 flex gap-3 pb-24 md:pb-8">
        <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="How much did I spend on Food last month?" className="flex-1 bg-gray-800 text-white rounded-2xl px-6 py-4 border border-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
        <button type="submit" className="bg-emerald-600 text-white px-6 rounded-2xl font-bold shadow-lg shadow-emerald-900/20 active:scale-90 transition-all">Send</button>
      </form>
    </div>
  );
};

/** * ==========================================
 * MAIN APP
 * ==========================================
 */

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [loading, setLoading] = useState(false);

  // Load session
  useEffect(() => {
    const savedUser = localStorage.getItem(USER_SESSION_KEY);
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch (e) { console.error("Session load error"); }
    }
  }, []);

  // Secure Auth Fetch
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const activeToken = token || localStorage.getItem(TOKEN_KEY);
    const headers = { 
      'Content-Type': 'application/json', 
      ...options.headers, 
      'Authorization': `Bearer ${activeToken}` 
    };
    return fetch(url, { ...options, headers });
  }, [token]);

  // Fetch Logic
  const fetchData = useCallback(async () => {
    if (!user || !token) return;
    setLoading(true);
    try {
      const [accRes, txRes] = await Promise.all([
        authFetch(`${API_BASE}/accounts`), 
        authFetch(`${API_BASE}/transactions`)
      ]);
      if (accRes.ok && txRes.ok) { 
        setAccounts(await accRes.json()); 
        setTransactions(await txRes.json()); 
      } else if (accRes.status === 401 || txRes.status === 401) {
        handleLogout();
      }
    } catch (err) { console.error("Sync error"); }
    finally { setLoading(false); }
  }, [user, token, authFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogin = (newUser: User, newToken: string) => {
    setUser(newUser); setToken(newToken);
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(newUser));
    localStorage.setItem(TOKEN_KEY, newToken);
    setCurrentView(AppView.DASHBOARD);
  };

  const handleLogout = () => {
    setUser(null); setToken(null); setTransactions([]); setAccounts([]);
    localStorage.removeItem(USER_SESSION_KEY); 
    localStorage.removeItem(TOKEN_KEY);
    setCurrentView(AppView.DASHBOARD);
  };

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    try {
      const res = await authFetch(`${API_BASE}/transactions`, { 
        method: 'POST', 
        body: JSON.stringify(newTx) 
      });
      if (res.ok) { 
        const data = await res.json(); 
        setTransactions(prev => [{ ...newTx, id: data.id } as Transaction, ...prev]); 
        setCurrentView(AppView.TRANSACTIONS); 
      }
    } catch (err) { console.error("Add error"); }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await authFetch(`${API_BASE}/transactions?id=${id}`, { method: 'DELETE' });
      if (res.ok) setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) { console.error("Delete error"); }
  };

  const handleAddAccount = async (name: string, icon: string) => {
    try {
      const res = await authFetch(`${API_BASE}/accounts`, { 
        method: 'POST', 
        body: JSON.stringify({ name, icon }) 
      });
      if (res.ok) { 
        const newAcc = await res.json(); 
        setAccounts(prev => [...prev, newAcc]); 
      }
    } catch (err) { console.error("Account creation error"); }
  };

  const handleDeleteAccount = async (id: string) => {
    if (accounts.length <= 1) return;
    try {
      const res = await authFetch(`${API_BASE}/accounts?id=${id}`, { method: 'DELETE' });
      if (res.ok) { 
        setAccounts(prev => prev.filter(a => a.id !== id));
        setTransactions(prev => prev.filter(t => t.accountId !== id));
        if (selectedAccountId === id) setSelectedAccountId('all');
      }
    } catch (err) { console.error("Account deletion error"); }
  };

  if (!user) return <Login onLogin={handleLogin} apiBase={API_BASE} />;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-emerald-500/30">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} user={user} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto h-screen relative bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.05),transparent_50%)]">
        <div className="md:hidden flex items-center justify-between p-4 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-40">
          <h1 className="text-xl font-black text-emerald-400">💎 SmartFinance</h1>
          <button onClick={() => setCurrentView(AppView.PROFILE)} className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-400 font-black">{user.name[0].toUpperCase()}</button>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
             <p className="text-gray-500 text-sm animate-pulse tracking-widest uppercase font-bold">Encrypted Sync...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {currentView === AppView.DASHBOARD && <Dashboard transactions={transactions} accounts={accounts} selectedAccountId={selectedAccountId} onSelectAccount={setSelectedAccountId} />}
            {currentView === AppView.ADD_ENTRY && <AddTransaction accounts={accounts} onAdd={handleAddTransaction} />}
            {currentView === AppView.TRANSACTIONS && <TransactionList transactions={transactions} accounts={accounts} onDelete={handleDeleteTransaction} />}
            {currentView === AppView.ACCOUNTS && <ManageAccounts accounts={accounts} onAddAccount={handleAddAccount} onDeleteAccount={handleDeleteAccount} />}
            {currentView === AppView.ASSISTANT && <AIAssistant transactions={transactions} accounts={accounts} />}
            {currentView === AppView.PROFILE && <Profile user={user} transactionCount={transactions.length} onLogout={handleLogout} />}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
