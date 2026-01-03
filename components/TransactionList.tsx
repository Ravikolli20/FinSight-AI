import React, { useMemo, useState } from 'react';
import { Transaction, Account } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  onDelete: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, accounts, onDelete }) => {
  const [filterAccountId, setFilterAccountId] = useState('all');

  const accountMap = useMemo(() => {
    const map = new Map<string, Account>();
    accounts.forEach(acc => map.set(acc.id, acc));
    return map;
  }, [accounts]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => filterAccountId === 'all' || t.accountId === filterAccountId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterAccountId]);


  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Recent Transactions</h2>
        <div className="relative">
          <select 
            value={filterAccountId} 
            onChange={e => setFilterAccountId(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5"
          >
            <option value="all">All Accounts</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.icon} {acc.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No transactions found for the selected account.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((t) => {
            const account = accountMap.get(t.accountId);
            return (
              <div key={t.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center hover:border-gray-600 transition-colors group">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                    ${t.type === 'income' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}
                  `}>
                    {t.category === 'Food' ? '🍔' : 
                     t.category === 'Travel' ? '🚕' : 
                     t.category === 'Shopping' ? '🛍️' : 
                     t.category === 'Salary' ? '💰' : '📄'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{t.description}</h4>
                    <p className="text-xs text-gray-400">
                      {t.date} • <span className="uppercase">{t.method}</span> • {t.category}
                      {account && <span className="ml-2 pl-2 border-l border-gray-600">{account.icon} {account.name}</span>}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className={`font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                    {t.type === 'income' ? '+' : '-'} ₹{t.amount.toLocaleString()}
                  </span>
                  <button 
                    onClick={() => onDelete(t.id)}
                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TransactionList;
