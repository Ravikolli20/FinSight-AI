import React, { useState, useRef, useEffect } from 'react';
import { Transaction, TransactionType, PaymentMethod, Account } from '../types';
import { analyzeReceiptImage } from '../services/geminiService';

interface AddTransactionProps {
  accounts: Account[];
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
}

const categories = [
    { name: 'Food', icon: '🍔', type: 'expense' as const },
    { name: 'Travel', icon: '🚕', type: 'expense' as const },
    { name: 'Shopping', icon: '🛍️', type: 'expense' as const },
    { name: 'Bills', icon: '🧾', type: 'expense' as const },
    { name: 'Rent', icon: '🏠', type: 'expense' as const },
    { name: 'Other', icon: '❓', type: 'expense' as const },
    { name: 'Salary', icon: '💰', type: 'income' as const },
    { name: 'Investment', icon: '📈', type: 'income' as const },
    { name: 'Gift', icon: '🎁', type: 'income' as const },
];

const AddTransaction: React.FC<AddTransactionProps> = ({ accounts, onAdd }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'scan'>('manual');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
    type: 'expense' as TransactionType,
    method: 'upi' as PaymentMethod,
    accountId: accounts[0]?.id || ''
  });

  const [scanPreview, setScanPreview] = useState<string | null>(null);

  const availableCategories = categories.filter(c => c.type === formData.type);
  
  useEffect(() => {
    if (!availableCategories.some(c => c.name === formData.category)) {
      setFormData(prev => ({
        ...prev,
        category: availableCategories[0]?.name || ''
      }));
    }
  }, [formData.type, availableCategories, formData.category]);

  // Set default account if accounts list loads
  useEffect(() => {
    if (!formData.accountId && accounts.length > 0) {
      setFormData(prev => ({ ...prev, accountId: accounts[0].id }));
    }
  }, [accounts, formData.accountId]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description || !formData.accountId) {
      alert("Please fill all fields, including selecting an account.");
      return;
    }

    onAdd({
      accountId: formData.accountId,
      amount: parseFloat(formData.amount),
      description: formData.description,
      category: formData.category,
      date: formData.date,
      type: formData.type,
      method: formData.method,
    });

    // Reset form
    setFormData({
      amount: '',
      description: '',
      category: 'Food',
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      method: 'upi',
      accountId: accounts[0]?.id || ''
    });
    setScanPreview(null);
    setActiveTab('manual');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64String = reader.result as string;
        setScanPreview(base64String);
        
        // Remove data URL prefix for API
        const base64Data = base64String.split(',')[1];

        try {
            const analyzedData = await analyzeReceiptImage(base64Data);
            setFormData(prev => ({
                ...prev,
                amount: analyzedData.amount?.toString() || '',
                description: analyzedData.description || '',
                category: analyzedData.category || 'Uncategorized',
                date: analyzedData.date || prev.date,
                method: analyzedData.method || 'upi',
                type: 'expense' // Usually receipts are expenses
            }));
            // Switch to manual tab to review
            setActiveTab('manual');
        } catch (err) {
            alert("Failed to analyze image. Please try again or enter manually.");
        } finally {
            setLoading(false);
        }
    };
    reader.readAsDataURL(file);
  };
  
  if (accounts.length === 0) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-white mb-4">No Accounts Found</h2>
        <p className="text-gray-400">Please create an account first before adding transactions.</p>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Add Transaction</h2>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'manual' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'scan' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          AI Scan (OCR)
        </button>
      </div>

      {activeTab === 'scan' && (
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center border-dashed border-2 border-gray-600">
           {loading ? (
             <div className="animate-pulse flex flex-col items-center">
               <div className="h-12 w-12 bg-blue-500 rounded-full mb-4 animate-bounce"></div>
               <p className="text-gray-300">Analyzing receipt with Gemini AI...</p>
             </div>
           ) : (
             <>
              <div className="mb-4 text-6xl">📸</div>
              <p className="text-gray-300 mb-4">Upload a screenshot of a UPI payment or a photo of a receipt.</p>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium"
              >
                Select Image
              </button>
             </>
           )}
        </div>
      )}

      {activeTab === 'manual' && (
        <form onSubmit={handleSubmit} className="space-y-4 bg-gray-800 p-6 rounded-xl border border-gray-700">
          
          {/* Type Selection */}
          <div className="flex bg-gray-900 p-1 rounded-lg mb-4">
            <button
              type="button"
              onClick={() => setFormData({...formData, type: 'income'})}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${formData.type === 'income' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, type: 'expense'})}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${formData.type === 'expense' ? 'bg-red-500 text-white' : 'text-gray-400'}`}
            >
              Expense
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Amount (₹)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="0.00"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Account</label>
              <select
                name="accountId"
                value={formData.accountId}
                onChange={handleInputChange}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="" disabled>Select Account</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.icon} {acc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="e.g. Grocery, Rent, Salary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {availableCategories.map((cat) => (
                <button
                  type="button"
                  key={cat.name}
                  onClick={() => setFormData(prev => ({ ...prev, category: cat.name }))}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 aspect-square
                    ${formData.category === cat.name 
                      ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400' 
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`
                  }
                  aria-pressed={formData.category === cat.name}
                >
                  <span className="text-2xl" aria-hidden="true">{cat.icon}</span>
                  <span className="text-xs mt-1 font-medium text-center">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Payment Method</label>
            <div className="flex space-x-3">
              {['upi', 'cash', 'bank'].map((m) => (
                <label key={m} className={`flex-1 cursor-pointer border rounded-lg p-3 flex items-center justify-center transition-colors ${formData.method === m ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-gray-900 border-gray-700 text-gray-400'}`}>
                  <input
                    type="radio"
                    name="method"
                    value={m}
                    checked={formData.method === m}
                    onChange={handleInputChange}
                    className="hidden"
                  />
                  <span className="capitalize">{m}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold text-lg transition-transform active:scale-95 mt-4"
          >
            Save Transaction
          </button>
        </form>
      )}
    </div>
  );
};

export default AddTransaction;
