import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChatMessage, Transaction, Account } from '../types';
import { askFinancialAdvisor } from '../services/geminiService';

interface AIAssistantProps {
  transactions: Transaction[];
  accounts: Account[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ transactions, accounts }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am your SmartFinance AI assistant. Ask me about your spending, savings, or budget advice. You can also ask about specific accounts.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endOfMsgRef = useRef<HTMLDivElement>(null);

  const accountMap = useMemo(() => {
    const map = new Map<string, Account>();
    accounts.forEach(acc => map.set(acc.id, acc));
    return map;
  }, [accounts]);

  const transactionsWithAccountNames = useMemo(() => {
    return transactions.map(t => ({
      ...t,
      accountName: accountMap.get(t.accountId)?.name || 'Unknown Account'
    }));
  }, [transactions, accountMap]);

  const scrollToBottom = () => {
    endOfMsgRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Prepare history for API (excluding timestamps)
    const historyForApi = messages.map(m => ({ role: m.role, text: m.text }));

    const responseText = await askFinancialAdvisor(historyForApi, userMsg.text, transactionsWithAccountNames as any);

    const botMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen pb-20 md:pb-0 bg-gray-900">
      <div className="p-4 border-b border-gray-800 bg-gray-900">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          🤖 AI Financial Advisor
        </h2>
        <p className="text-xs text-gray-500">Powered by Gemini 2.5 Flash</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-br-none' 
                  : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'
              }`}
            >
              {/* Simple markdown rendering for bold text */}
              {msg.text.split('**').map((part, i) => 
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-800 p-3 rounded-2xl rounded-bl-none border border-gray-700 flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75"></span>
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
        <div ref={endOfMsgRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-gray-900 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: How much did I spend from 'Salary'?"
            className="flex-1 bg-gray-800 text-white rounded-full px-4 py-3 border border-gray-700 focus:outline-none focus:border-emerald-500"
          />
          <button 
            type="submit"
            disabled={isTyping || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full p-3 w-12 h-12 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIAssistant;
