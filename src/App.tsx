/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Coins, Activity, TrendingUp, Search, Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'token' | 'hl'>('token');

  // Token Insight State
  const [tokenId, setTokenId] = useState('chainlink');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenResult, setTokenResult] = useState<any>(null);

  // HL State
  const [wallet, setWallet] = useState('0x0000000000000000000000000000000000000000');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [hlLoading, setHlLoading] = useState(false);
  const [hlResult, setHlResult] = useState<any>(null);

  const fetchTokenInsight = async () => {
    setTokenLoading(true);
    try {
      const res = await fetch(`/api/token/${tokenId}/insight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vs_currency: 'usd', history_days: 30 })
      });
      const data = await res.json();
      setTokenResult(data);
    } catch (err) {
      console.error(err);
      alert('Error fetching token insight');
    }
    setTokenLoading(false);
  };

  const fetchHlPnl = async () => {
    setHlLoading(true);
    try {
      const res = await fetch(`/api/hyperliquid/${wallet}/pnl?start=${startDate}&end=${endDate}`);
      const data = await res.json();
      setHlResult(data);
    } catch (err) {
      console.error(err);
      alert('Error fetching HyperLiquid data');
    }
    setHlLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-300 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center space-x-3 mb-10">
          <Activity className="w-8 h-8 text-emerald-500" />
          <h1 className="text-2xl font-semibold text-white tracking-tight">Backend Assignment Dashboard</h1>
        </header>

        <div className="flex space-x-4 border-b border-white/10 pb-1">
          <button 
            onClick={() => setActiveTab('token')}
            className={`px-4 py-2 font-medium flex items-center space-x-2 transition-colors ${activeTab === 'token' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
           <Coins className="w-4 h-4" /> <span>Token Insight</span>
          </button>
          <button 
            onClick={() => setActiveTab('hl')}
            className={`px-4 py-2 font-medium flex items-center space-x-2 transition-colors ${activeTab === 'hl' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <TrendingUp className="w-4 h-4" /> <span>HyperLiquid PnL</span>
          </button>
        </div>

        {activeTab === 'token' && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-xl font-medium text-white">Token Insight API</h2>
              <p className="text-slate-400 text-sm">Fetches CoinGecko data and requests an AI-generated reasoning and sentiment summary.</p>
              
              <div className="bg-white/5 p-4 rounded-xl space-y-4 border border-white/10">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Token ID (CoinGecko)</label>
                  <input 
                    type="text" 
                    value={tokenId} 
                    onChange={e => setTokenId(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <button 
                  onClick={fetchTokenInsight}
                  disabled={tokenLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  {tokenLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Fetch Insight'}
                </button>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-[400px] overflow-auto custom-scrollbar">
              {tokenResult ? (
                <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap">
                  {JSON.stringify(tokenResult, null, 2)}
                </pre>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 font-mono text-sm">
                  Response will appear here
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'hl' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h2 className="text-xl font-medium text-white">HyperLiquid Daily PnL</h2>
                <p className="text-slate-400 text-sm">Aggregates historical trades and funding payments to calculate daily realized PnL and net changes.</p>
                
                <div className="bg-white/5 p-4 rounded-xl space-y-4 border border-white/10">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Wallet Address</label>
                    <input 
                      type="text" 
                      value={wallet} 
                      onChange={e => setWallet(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                      <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors color-scheme-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">End Date</label>
                      <input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors color-scheme-dark"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={fetchHlPnl}
                    disabled={hlLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {hlLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Fetch Daily PnL'}
                  </button>
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-[320px] overflow-auto custom-scrollbar">
                {hlResult ? (
                  <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap">
                    {JSON.stringify(hlResult, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 font-mono text-sm">
                    Response will appear here
                  </div>
                )}
              </div>
            </div>

            {hlResult?.daily?.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-medium text-white mb-6">Net PnL (USD) over Time</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hlResult.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="date" stroke="#666" tick={{fill: '#666', fontSize: 12}} tickMargin={10} />
                      <YAxis stroke="#666" tick={{fill: '#666', fontSize: 12}} tickFormatter={(v) => `$${v}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                        itemStyle={{ color: '#10b981' }}
                      />
                      <Line type="monotone" dataKey="net_pnl_usd" stroke="#10b981" strokeWidth={2} dot={{fill: '#10b981', r: 4}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
