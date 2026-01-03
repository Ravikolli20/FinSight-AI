
import React, { useState } from 'react';
import { Account } from '../types';

interface ManageAccountsProps {
  accounts: Account[];
  onAddAccount: (name: string, icon: string) => void;
  onDeleteAccount: (id: string) => void;
}

const icons = ['💼', '🏠', '📈', '🎁', '🏦', '💳', '🛠️', '💰', '🚕', '🍔', '🛒', '⚡'];

const ManageAccounts: React.FC<ManageAccountsProps> = ({ accounts, onAddAccount, onDeleteAccount }) => {
  const [newName, setNewName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(icons[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddAccount(newName, selectedIcon);
    setNewName('');
    setSelectedIcon(icons[0]);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto pb-24 md:pb-6">
      <h2 className="text-2xl font-bold text-white mb-6">Manage Accounts</h2>

      {/* Add Account Form */}
      <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8">
        <h3 className="text-lg font-semibold mb-4">Add New Account</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Account Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Side Hustle, Savings Jar"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Select Icon</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {icons.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`aspect-square flex items-center justify-center text-2xl rounded-lg border-2 transition-all duration-200 ${
                    selectedIcon === icon 
                      ? 'border-emerald-500 bg-emerald-900/40 scale-105' 
                      : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold transition-transform active:scale-95 shadow-lg shadow-emerald-900/20"
          >
            Add Account
          </button>
        </div>
      </form>

      {/* Existing Accounts List */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-300">Existing Accounts</h3>
        <div className="space-y-3">
          {accounts.map(acc => (
            <div key={acc.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center group hover:border-gray-600 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center text-2xl border border-gray-700">
                  {acc.icon}
                </div>
                <div>
                  <span className="font-semibold text-white block">{acc.name}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-widest">Account</span>
                </div>
              </div>
              <button
                onClick={() => onDeleteAccount(acc.id)}
                className="text-gray-600 hover:text-red-400 transition-colors p-2"
                title="Delete Account"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManageAccounts;
