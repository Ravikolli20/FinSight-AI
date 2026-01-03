
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Transaction, DashboardStats, Account } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  accounts: Account[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6', '#6366f1'];

const Dashboard: React.FC<DashboardProps> = ({ transactions, accounts, selectedAccountId, onSelectAccount }) => {

  const filteredTransactions = useMemo(() => {
    if (selectedAccountId === 'all') {
      return transactions;
    }
    return transactions.filter(t => t.accountId === selectedAccountId);
  }, [transactions, selectedAccountId]);
  
  const stats: DashboardStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let cash = 0;
    let digital = 0;

    filteredTransactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
        if (t.method === 'cash') cash += t.amount;
        else digital += t.amount;
      } else {
        expense += t.amount;
        if (t.method === 'cash') cash -= t.amount;
        else digital -= t.amount;
      }
    });

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      cashBalance: cash,
      digitalBalance: digital
    };
  }, [filteredTransactions]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        data[t.category] = (data[t.category] || 0) + t.amount;
      });
    
    return Object.keys(data).map(key => ({ name: key, value: data[key] }));
  }, [filteredTransactions]);

  const monthlyData = useMemo(() => {
    const data: Record<string, { income: number, expense: number }> = {};
    filteredTransactions.forEach(t => {
      const month = t.date.substring(0, 7); // YYYY-MM
      if (!data[month]) data[month] = { income: 0, expense: 0 };
      if (t.type === 'income') data[month].income += t.amount;
      else data[month].expense += t.amount;
    });

    return Object.keys(data).sort().map(key => ({
      name: key,
      Income: data[key].income,
      Expense: data[key].expense
    }));
  }, [filteredTransactions]);

  const handleDownloadReport = () => {
    if (filteredTransactions.length === 0) {
      alert("No transactions to export.");
      return;
    }

    const headers = ["Date", "Description", "Category", "Type", "Method", "Amount"];
    const rows = filteredTransactions.map(t => [
      t.date,
      t.description.replace(/,/g, ' '), // sanitize
      t.category,
      t.type,
      t.method,
      t.amount
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `SmartFinance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Financial Overview</h2>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleDownloadReport}
            className="flex items-center gap-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold"
          >
            <span>📥</span> Download Report
          </button>
          
          <div className="relative shrink-0">
            <select 
              value={selectedAccountId} 
              onChange={e => onSelectAccount(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none block p-2.5 appearance-none pr-10"
            >
              <option value="all">🏦 All Accounts</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.icon} {acc.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl shadow-black/20">
          <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Balance</p>
          <h3 className={`text-4xl font-black mt-2 ${stats.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ₹{stats.balance.toLocaleString()}
          </h3>
          <div className="flex justify-between mt-6 pt-4 border-t border-gray-700 text-xs text-gray-400">
            <div className="flex flex-col">
               <span>INCOME</span>
               <span className="text-emerald-400 font-bold">₹{stats.totalIncome.toLocaleString()}</span>
            </div>
            <div className="flex flex-col text-right">
               <span>EXPENSE</span>
               <span className="text-red-400 font-bold">₹{stats.totalExpense.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl shadow-black/20">
          <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Wallet Split</p>
          <div className="flex justify-between items-center mt-4">
            <div>
              <span className="block text-[10px] text-blue-400 font-bold uppercase tracking-widest">Digital</span>
              <span className="text-2xl font-bold text-white">₹{stats.digitalBalance.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Cash</span>
              <span className="text-2xl font-bold text-white">₹{stats.cashBalance.toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-6 flex h-2 rounded-full overflow-hidden bg-gray-700">
             {stats.digitalBalance + stats.cashBalance > 0 ? (
               <>
                <div style={{ width: `${(stats.digitalBalance / (stats.digitalBalance + stats.cashBalance)) * 100}%` }} className="bg-blue-500"></div>
                <div style={{ width: `${(stats.cashBalance / (stats.digitalBalance + stats.cashBalance)) * 100}%` }} className="bg-emerald-500"></div>
               </>
             ) : (
                <div className="w-full bg-gray-600"></div>
             )}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl shadow-black/20 flex flex-col justify-center">
           <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Savings Rate</p>
           <div className="relative pt-1">
             <div className="overflow-hidden h-4 mb-1 text-xs flex rounded-full bg-gray-700">
               <div 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${stats.totalIncome > 0 ? Math.max(0, ((stats.totalIncome - stats.totalExpense) / stats.totalIncome) * 100) : 0}%` }}
               ></div>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-xs font-semibold inline-block text-emerald-400">
                  {stats.totalIncome > 0 ? Math.round(((stats.totalIncome - stats.totalExpense) / stats.totalIncome) * 100) : 0}% SAVED
                </span>
                <span className="text-xs text-gray-500">Progress to Goal</span>
             </div>
           </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 h-[400px] shadow-xl shadow-black/20">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-gray-700 pb-2">Expenses by Category</h3>
          {categoryData.length > 0 ? (
            <div className="h-full">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => `₹${value.toLocaleString()}`}
                  />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 pb-20">
              <span className="text-4xl">📉</span>
              <p>No expense data recorded yet</p>
            </div>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 h-[400px] shadow-xl shadow-black/20">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-gray-700 pb-2">Monthly Trends</h3>
           {monthlyData.length > 0 ? (
            <div className="h-full">
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    tick={{fontSize: 11, fontWeight: 'bold'}} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    tick={{fontSize: 11}} 
                    axisLine={false} 
                    tickLine={false} 
                    width={50}
                    tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                  />
                  <Tooltip 
                    cursor={{fill: '#1f2937', opacity: 0.4}}
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ fontWeight: 'bold' }}
                    formatter={(value: number) => `₹${value.toLocaleString()}`}
                  />
                  <Legend verticalAlign="top" align="right" iconType="rect" wrapperStyle={{ paddingBottom: '30px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }} />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
                  <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
           ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 pb-20">
               <span className="text-4xl">📊</span>
               <p>No monthly trends available</p>
            </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
