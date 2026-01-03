
import React from 'react';
import { AppView, User } from '../types';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  user: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, user, onLogout }) => {
  const navItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: '📊' },
    { id: AppView.ADD_ENTRY, label: 'Add Entry', icon: '➕' },
    { id: AppView.TRANSACTIONS, label: 'Transactions', icon: '🧾' },
    { id: AppView.ACCOUNTS, label: 'Accounts', icon: '🏦' },
    { id: AppView.ASSISTANT, label: 'AI Assistant', icon: '🤖' },
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

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
              ${currentView === item.id 
                ? 'text-emerald-400 bg-gray-800' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
          >
            <span className="text-2xl md:text-lg md:mr-3">{item.icon}</span>
            <span className="text-xs md:text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User Profile Section */}
      {user && (
        <div className="hidden md:flex flex-col p-4 border-t border-gray-800 mt-auto">
          <button 
            onClick={() => onChangeView(AppView.PROFILE)}
            className={`flex items-center p-2 rounded-xl transition-all mb-2 ${currentView === AppView.PROFILE ? 'bg-emerald-900/20 border border-emerald-500/30' : 'hover:bg-gray-800 border border-transparent'}`}
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold mr-3 shrink-0">
              {getInitials(user.name)}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-emerald-500/70 font-mono tracking-tighter">ID: {user.syncToken}</p>
            </div>
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center px-4 py-2 text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            <span className="mr-2">🚪</span> Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
