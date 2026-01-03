
import React from 'react';
import { User } from '../types';

interface ProfileProps {
  user: User;
  transactionCount: number;
}

const Profile: React.FC<ProfileProps> = ({ user, transactionCount }) => {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 pb-24 md:pb-6">
      <h2 className="text-2xl font-bold text-white mb-6">User Profile</h2>

      {/* Profile Card */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
        <div className="h-24 bg-gradient-to-r from-emerald-600 to-emerald-900"></div>
        <div className="px-6 pb-6 relative">
          <div className="absolute -top-12 left-6">
            <div className="w-24 h-24 rounded-2xl bg-gray-900 border-4 border-gray-800 flex items-center justify-center text-4xl text-emerald-400 font-black shadow-xl">
              {user.name[0].toUpperCase()}
            </div>
          </div>
          <div className="pt-16">
            <h3 className="text-xl font-bold text-white">{user.name}</h3>
            <p className="text-gray-400 text-sm">{user.email}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
               <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Transactions</p>
               <p className="text-2xl font-bold text-white">{transactionCount}</p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
               <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Member Since</p>
               <p className="text-lg font-bold text-white">Mar 2025</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Sync Card */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <span>☁️</span> Cloud Connectivity
          </h4>
          <span className="px-2 py-1 bg-gray-900 text-yellow-500 text-[10px] font-bold rounded border border-yellow-500/30 uppercase tracking-widest">Local Only</span>
        </div>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          Your data is currently stored locally on this device. To sync with other devices, you will need a <strong>SmartFinance Cloud</strong> subscription.
        </p>
        
        <div className="bg-gray-950 p-4 rounded-xl border border-gray-700 flex flex-col items-center gap-2 mb-4">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em]">Your Personal Sync Token</p>
          <div className="text-2xl font-mono text-emerald-400 font-bold tracking-widest">
            {user.syncToken}
          </div>
          <button className="text-xs text-emerald-500 hover:text-emerald-400 font-bold underline mt-1">Copy Token</button>
        </div>

        <button className="w-full bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 py-3 rounded-xl font-bold text-sm transition-all">
          Upgrade to Cloud Sync
        </button>
      </div>
    </div>
  );
};

export default Profile;
