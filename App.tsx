import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, 
  XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from 'recharts';

/** * ==========================================
 * TYPES & CONSTANTS
 * ==========================================
 */

const API_BASE = 'http://localhost:5000/api';
const USER_SESSION_KEY = 'smartfinance_current_user';
const TOKEN_KEY = 'smartfinance_access_token';

type TransactionType = 'income' | 'expense';
type PaymentMethod = 'cash' | 'upi' | 'bank' | 'credit_card';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
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
 * AI SERVICES (Gemini 2.5)
 * ==========================================
 */

const apiKey = ""; // Managed by environment

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
    console.error("Gemini Error:", error);
    return "";
  }
};

/** * ==========================================
 * COMPONENTS
 * ==========================================
 */

// --- Sidebar Component ---
const Sidebar: React.FC<{ currentView: AppView; onChangeView: (v: AppView) => void; user: User | null; onLogout: () => void; }> = ({ currentView, onChangeView, user, onLogout }) => {
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
      {user && (
        <div className="hidden md:flex flex-col p-4 border-t border-gray-800 mt-auto">
          <button onClick={() => onChangeView(AppView.PROFILE)} className="flex items-center p-2 rounded-xl transition-all mb-2 hover:bg-gray-800">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold mr-3">{user.name[0]}</div>
            <div className="text-left overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
            </div>
          </button>
          <button onClick={onLogout} className="flex items-center px-4 py-2 text-xs text-gray-500 hover:text-red-400">🚪 Logout</button>
        </div>
      )}
    </div>
  );
};

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
      setError('Connection failed. Backend active?');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 text-3xl">💎</div>
          <h1 className="text-2xl font-bold text-white">SmartFinance</h1>
          <p className="text-gray-400 text-sm mt-1">AI Wealth Management</p>
        </div>
        {error && <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-3 rounded-xl text-xs mb-4 text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" required />}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" required />
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-all flex justify-center items-center gap-2">
            {loading ? '...' : (isSignUp ? 'Create Account' : 'Sign In')}
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

// --- Dashboard Component ---
const Dashboard: React.FC<{ transactions: Transaction[]; accounts: Account[]; selectedAccountId: string; onSelectAccount: (id: string) => void; }> = ({ transactions, accounts, selectedAccountId, onSelectAccount }) => {
  const filteredTransactions = useMemo(() => selectedAccountId === 'all' ? transactions : transactions.filter(t => t.accountId === selectedAccountId), [transactions, selectedAccountId]);
  
  const stats = useMemo(() => {
    let inc = 0, exp = 0;
    filteredTransactions.forEach(t => t.type === 'income' ? inc += t.amount : exp += t.amount);
    return { balance: inc - exp, income: inc, expense: exp };
  }, [filteredTransactions]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => data[t.category] = (data[t.category] || 0) + t.amount);
    return Object.keys(data).map(key => ({ name: key, value: data[key] }));
  }, [filteredTransactions]);

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Financial Overview</h2>
        <select value={selectedAccountId} onChange={e => onSelectAccount(e.target.value)} className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl p-2.5">
          <option value="all">🏦 All Accounts</option>
          {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.icon} {acc.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
          <p className="text-gray-400 text-sm font-medium">TOTAL BALANCE</p>
          <h3 className={`text-4xl font-black mt-2 ${stats.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{stats.balance.toLocaleString()}</h3>
        </div>
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
          <p className="text-gray-400 text-sm font-medium">MONTHLY INCOME</p>
          <h3 className="text-3xl font-bold mt-2 text-white">₹{stats.income.toLocaleString()}</h3>
        </div>
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
          <p className="text-gray-400 text-sm font-medium">MONTHLY EXPENSE</p>
          <h3 className="text-3xl font-bold mt-2 text-red-400">₹{stats.expense.toLocaleString()}</h3>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 h-[350px]">
          <h3 className="text-lg font-bold text-white mb-4">Expenses by Category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                  {categoryData.map((_, i) => <Cell key={i} fill={['#10b981', '#3b82f6', '#f43f5e', '#f59e0b'][i % 4]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '10px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-full flex items-center justify-center text-gray-500">No data available</div>}
        </div>
      </div>
    </div>
  );
};

// --- Transaction List Component ---
const TransactionList: React.FC<{ transactions: Transaction[]; accounts: Account[]; onDelete: (id: string) => void; }> = ({ transactions, accounts, onDelete }) => {
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Recent Transactions</h2>
      <div className="space-y-3">
        {transactions.length > 0 ? transactions.map((t) => (
          <div key={t.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center group">
            <div className="flex items-center space-x-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${t.type === 'income' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                {t.type === 'income' ? '💰' : '💸'}
              </div>
              <div>
                <h4 className="font-semibold text-white">{t.description}</h4>
                <p className="text-xs text-gray-400">{t.date} • {t.category} • {accountMap.get(t.accountId)?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                {t.type === 'income' ? '+' : '-'} ₹{t.amount.toLocaleString()}
              </span>
              <button onClick={() => onDelete(t.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
            </div>
          </div>
        )) : <p className="text-gray-500 text-center py-10">No transactions found.</p>}
      </div>
    </div>
  );
};

// --- Add Transaction Component ---
const AddTransaction: React.FC<{ accounts: Account[]; onAdd: (t: Omit<Transaction, 'id'>) => void; }> = ({ accounts, onAdd }) => {
  const [formData, setFormData] = useState({
    amount: '', description: '', category: 'Food', date: new Date().toISOString().split('T')[0],
    type: 'expense' as TransactionType, method: 'upi' as PaymentMethod, accountId: accounts[0]?.id || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.accountId) return;
    onAdd({ ...formData, amount: parseFloat(formData.amount) });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-white">Add Entry</h2>
      <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
        <div className="flex bg-gray-900 p-1 rounded-lg">
          <button type="button" onClick={() => setFormData({...formData, type: 'income'})} className={`flex-1 py-2 rounded-md text-sm ${formData.type === 'income' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>Income</button>
          <button type="button" onClick={() => setFormData({...formData, type: 'expense'})} className={`flex-1 py-2 rounded-md text-sm ${formData.type === 'expense' ? 'bg-red-500 text-white' : 'text-gray-400'}`}>Expense</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input type="number" placeholder="Amount" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white" required />
          <select value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white">
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.icon} {acc.name}</option>)}
          </select>
        </div>
        <input type="text" placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white" required />
        <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white" />
        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold">Save Transaction</button>
      </form>
    </div>
  );
};

// --- AI Assistant Component ---
const AIAssistant: React.FC<{ transactions: Transaction[]; accounts: Account[]; }> = ({ transactions, accounts }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: 'Ask me about your spending!', timestamp: Date.now() }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const prompt = `User Context: ${JSON.stringify(transactions.slice(0, 50))}. User Message: ${userMsg.text}`;
    const system = "You are a financial advisor. Use the provided data to answer. Be concise.";
    
    const response = await callGemini(prompt, system);
    setMessages(prev => [...prev, { role: 'model', text: response || "I'm not sure about that.", timestamp: Date.now() }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen bg-gray-900 p-4">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-200 border border-gray-700'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-gray-500 animate-pulse">Thinking...</div>}
      </div>
      <form onSubmit={handleSend} className="flex gap-2">
        <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything..." className="flex-1 bg-gray-800 text-white rounded-full px-4 py-3 border border-gray-700 outline-none" />
        <button type="submit" className="bg-emerald-600 text-white p-3 rounded-full w-12 h-12">➤</button>
      </form>
    </div>
  );
};

// --- Manage Accounts Component ---
const ManageAccounts: React.FC<{ accounts: Account[]; onAddAccount: (n: string, i: string) => void; onDeleteAccount: (id: string) => void; }> = ({ accounts, onAddAccount, onDeleteAccount }) => {
  const [name, setName] = useState('');
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold text-white">Manage Accounts</h2>
      <form onSubmit={e => { e.preventDefault(); onAddAccount(name, '🏦'); setName(''); }} className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
        <input type="text" placeholder="Account Name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white" />
        <button className="w-full bg-emerald-600 py-3 rounded-lg font-bold">Add Account</button>
      </form>
      <div className="space-y-3">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
            <span className="text-white font-bold">{acc.icon} {acc.name}</span>
            <button onClick={() => onDeleteAccount(acc.id)} className="text-red-500 text-sm">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Profile Component ---
const Profile: React.FC<{ user: User; transactionCount: number; onLogout: () => void; }> = ({ user, transactionCount, onLogout }) => (
  <div className="p-6 max-w-2xl mx-auto space-y-6">
    <h2 className="text-2xl font-bold text-white">User Profile</h2>
    <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
      <div className="h-24 bg-emerald-600"></div>
      <div className="px-6 pb-6 relative">
        <div className="absolute -top-12 left-6 w-24 h-24 rounded-2xl bg-gray-900 border-4 border-gray-800 flex items-center justify-center text-4xl text-emerald-400 font-black">{user.name[0]}</div>
        <div className="pt-16"><h3 className="text-xl font-bold text-white">{user.name}</h3><p className="text-gray-400 text-sm">{user.email}</p></div>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700"><p className="text-xs text-gray-500 mb-1">Transactions</p><p className="text-2xl font-bold text-white">{transactionCount}</p></div>
          <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700"><p className="text-xs text-gray-500 mb-1">Member Since</p><p className="text-lg font-bold text-white">2026</p></div>
        </div>
      </div>
    </div>
    <button onClick={onLogout} className="w-full bg-red-900/20 text-red-500 border border-red-500/20 py-3 rounded-xl font-bold">Logout Session</button>
  </div>
);

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

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const activeToken = token || localStorage.getItem(TOKEN_KEY);
    const headers = { 'Content-Type': 'application/json', ...options.headers, 'Authorization': `Bearer ${activeToken}` };
    return fetch(url, { ...options, headers });
  }, [token]);

  const fetchData = useCallback(async () => {
    if (!user || !token) return;
    setLoading(true);
    try {
      const [accRes, txRes] = await Promise.all([authFetch(`${API_BASE}/accounts`), authFetch(`${API_BASE}/transactions`)]);
      if (accRes.ok && txRes.ok) { setAccounts(await accRes.json()); setTransactions(await txRes.json()); }
      else if (accRes.status === 401 || txRes.status === 401) handleLogout();
    } catch (err) { console.error("Fetch error"); }
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
    localStorage.removeItem(USER_SESSION_KEY); localStorage.removeItem(TOKEN_KEY);
  };

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    try {
      const res = await authFetch(`${API_BASE}/transactions`, { method: 'POST', body: JSON.stringify(newTx) });
      if (res.ok) { const { id } = await res.json(); setTransactions(prev => [{ ...newTx, id } as Transaction, ...prev]); setCurrentView(AppView.TRANSACTIONS); }
    } catch (err) { console.error("Add error"); }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await authFetch(`${API_BASE}/transactions?id=${id}`, { method: 'DELETE' });
      if (res.ok) setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) { console.error("Delete error"); }
  };

  if (!user) return <Login onLogin={handleLogin} apiBase={API_BASE} />;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-950 text-gray-100 font-sans">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} user={user} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto h-screen relative">
        <div className="md:hidden flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
          <h1 className="text-lg font-bold text-emerald-400">SmartFinance</h1>
          <button onClick={() => setCurrentView(AppView.PROFILE)} className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400 font-bold">{user.name[0]}</button>
        </div>
        {loading ? <div className="p-10 text-center animate-pulse text-gray-500">Syncing...</div> : (
          <>
            {currentView === AppView.DASHBOARD && <Dashboard transactions={transactions} accounts={accounts} selectedAccountId={selectedAccountId} onSelectAccount={setSelectedAccountId} />}
            {currentView === AppView.ADD_ENTRY && <AddTransaction accounts={accounts} onAdd={handleAddTransaction} />}
            {currentView === AppView.TRANSACTIONS && <TransactionList transactions={transactions} accounts={accounts} onDelete={handleDeleteTransaction} />}
            {currentView === AppView.ACCOUNTS && <ManageAccounts accounts={accounts} onAddAccount={(n, i) => {}} onDeleteAccount={id => {}} />}
            {currentView === AppView.ASSISTANT && <AIAssistant transactions={transactions} accounts={accounts} />}
            {currentView === AppView.PROFILE && <Profile user={user} transactionCount={transactions.length} onLogout={handleLogout} />}
          </>
        )}
      </main>
    </div>
  );
};

export default App;