import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Download, 
  Copy, 
  Search, 
  Sparkles, 
  Grid, 
  Layers, 
  XSquare, 
  Lock, 
  AlertTriangle,
  UserCheck, 
  FileCheck2,
  Trash2,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { ComboItem, SubscriptionTier } from '../types';

interface ResultsExportProps {
  combos: ComboItem[];
  setCombos: React.Dispatch<React.SetStateAction<ComboItem[]>>;
  addLog: (type: 'info' | 'success' | 'warning' | 'error' | 'debug', msg: string) => void;
}

type ModeTab = 'hits' | 'free' | '2fa' | 'invalid' | 'errors' | 'all';
type ExportSyntax = 'basic' | 'captured_full' | 'captured_simple';

export function ResultsExport({ combos, setCombos, addLog }: ResultsExportProps) {
  const [activeTab, setActiveTab] = useState<ModeTab>('hits');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<SubscriptionTier | 'ALL'>('ALL');
  const [countryFilter, setCountryFilter] = useState<string | 'ALL'>('ALL');
  
  // Exporter Syntax State
  const [exportSyntax, setExportSyntax] = useState<ExportSyntax>('captured_full');

  // Clear checked results
  const clearChecked = () => {
    setCombos(prev => {
      const rest = prev.filter(c => c.status === 'unchecked');
      addLog('warning', `Deleted all checked outcomes (${prev.length - rest.length} records). preserved ${rest.length} unchecked.`);
      return rest;
    });
  };

  // Extract all unique country codes from lists
  const availableCountries = Array.from(
    new Set(combos.filter(c => c.country && c.country !== 'N/A').map(c => c.country))
  ).sort();

  // Filter accounts based on queries
  const processedAccounts = combos.filter(c => {
    let matchesTab = false;
    if (activeTab === 'hits') matchesTab = c.status === 'hit_premium';
    else if (activeTab === 'free') matchesTab = c.status === 'free';
    else if (activeTab === '2fa') matchesTab = c.status === '2fa';
    else if (activeTab === 'invalid') matchesTab = c.status === 'invalid';
    else if (activeTab === 'errors') matchesTab = c.status === 'error';
    else matchesTab = c.status !== 'unchecked'; // Show checked

    const matchesSearch = c.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.pass.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTier = tierFilter === 'ALL' || c.tier === tierFilter;
    const matchesCountry = countryFilter === 'ALL' || c.country === countryFilter;

    return matchesTab && matchesSearch && matchesTier && matchesCountry;
  });

  // Calculate target lists for formatting output text
  const getOutputText = (accounts: ComboItem[]): string => {
    return accounts.map(acc => {
      if (exportSyntax === 'basic') {
        return `${acc.email}:${acc.pass}`;
      } else if (exportSyntax === 'captured_simple') {
        return `${acc.email}:${acc.pass} | Tier: ${acc.tier} | Exp: ${acc.expiry}`;
      } else {
        // Full Capture
        return `${acc.email}:${acc.pass} | Tier: ${acc.tier} | Country: ${acc.country} | Billing: ${acc.nextBilling} | Payment: ${acc.paymentMethod} | Profiles: ${acc.profiles}`;
      }
    }).join('\n');
  };

  // Export copy
  const handleCopy = () => {
    if (processedAccounts.length === 0) {
      addLog('warning', 'No checked accounts found in active view to copy.');
      return;
    }
    const formatted = getOutputText(processedAccounts);
    navigator.clipboard.writeText(formatted);
    addLog('success', `Copied ${processedAccounts.length} accounts to clipboard using [${exportSyntax}] formatting syntax.`);
  };

  // Download .txt file
  const handleDownload = () => {
    if (processedAccounts.length === 0) return;
    const formatted = getOutputText(processedAccounts);
    const blob = new Blob([formatted], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set file named base on category
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `Crunchyroll_${activeTab.toUpperCase()}_EXPORT_${stamp}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    addLog('success', `Downloaded Crunchyroll file: "Crunchyroll_${activeTab.toUpperCase()}_EXPORT_${stamp}.txt"`);
  };

  // Summary Counts
  const hitsCount = combos.filter(c => c.status === 'hit_premium').length;
  const freeCount = combos.filter(c => c.status === 'free').length;
  const lockCount = combos.filter(c => c.status === '2fa').length;
  const badCount = combos.filter(c => c.status === 'invalid').length;
  const errCount = combos.filter(c => c.status === 'error').length;
  const totalChecked = combos.filter(c => c.status !== 'unchecked').length;

  return (
    <div className="space-y-6" id="results-export-section">
      {/* Category Selection Tabs Card */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/5 gap-4">
          <div>
            <h2 className="text-lg font-black font-sans uppercase text-white tracking-tight">Live Accounts Database</h2>
            <p className="text-white/40 text-xs mt-1 font-sans">
              Filter outputs by specific parameters and export to custom layouts.
            </p>
          </div>

          <button
            onClick={clearChecked}
            disabled={totalChecked === 0}
            className="self-start md:self-auto py-2.5 px-4 border border-white/5 hover:border-rose-900 bg-[#222] text-rose-450 hover:bg-rose-950/20 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Flush Checked Outcomes ({totalChecked})</span>
          </button>
        </div>

        {/* Tab row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 mt-5">
          <button
            onClick={() => { setActiveTab('hits'); setTierFilter('ALL'); }}
            className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer ${
              activeTab === 'hits'
                ? 'bg-[#FF6400]/15 border-[#FF6400] text-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.15)]'
                : 'bg-black/40 border-white/5 text-white/40 hover:border-white/10 hover:text-white'
            }`}
          >
            <UserCheck className="w-5 h-5 mb-1 text-emerald-500" />
            <span className="text-xs font-black uppercase tracking-tight mt-1">Premium Hits</span>
            <span className="text-sm font-bold font-mono mt-2">{hitsCount}</span>
          </button>

          <button
            onClick={() => { setActiveTab('free'); setTierFilter('ALL'); }}
            className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer ${
              activeTab === 'free'
                ? 'bg-[#FF6400]/15 border-[#FF6400] text-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.15)]'
                : 'bg-black/40 border-white/5 text-white/40 hover:border-white/10 hover:text-white'
            }`}
          >
            <FileCheck2 className="w-5 h-5 mb-1 text-sky-500" />
            <span className="text-xs font-black uppercase tracking-tight mt-1">Free Tier</span>
            <span className="text-sm font-bold mt-2 font-mono">{freeCount}</span>
          </button>

          <button
            onClick={() => { setActiveTab('2fa'); setTierFilter('ALL'); }}
            className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer ${
              activeTab === '2fa'
                ? 'bg-[#FF6400]/15 border-[#FF6400] text-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.15)]'
                : 'bg-black/40 border-white/5 text-white/40 hover:border-white/10 hover:text-white'
            }`}
          >
            <Lock className="w-5 h-5 mb-1 text-amber-500" />
            <span className="text-xs font-black uppercase tracking-tight mt-1">2FA Challenges</span>
            <span className="text-sm font-bold mt-2 font-mono">{lockCount}</span>
          </button>

          <button
            onClick={() => { setActiveTab('invalid'); setTierFilter('ALL'); }}
            className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer ${
              activeTab === 'invalid'
                ? 'bg-[#FF6400]/15 border-[#FF6400] text-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.15)]'
                : 'bg-black/40 border-white/5 text-white/40 hover:border-white/10 hover:text-white'
            }`}
          >
            <XSquare className="w-5 h-5 mb-1 text-rose-500" />
            <span className="text-xs font-black uppercase tracking-tight mt-1">Bad Accounts</span>
            <span className="text-sm font-bold mt-2 font-mono">{badCount}</span>
          </button>

          <button
            onClick={() => { setActiveTab('errors'); setTierFilter('ALL'); }}
            className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer ${
              activeTab === 'errors'
                ? 'bg-[#FF6400]/15 border-[#FF6400] text-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.15)]'
                : 'bg-black/40 border-white/5 text-white/40 hover:border-white/10 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-5 h-5 mb-1 text-purple-500" />
            <span className="text-xs font-black uppercase tracking-tight mt-1">Bad Sockets</span>
            <span className="text-sm font-bold mt-2 font-mono">{errCount}</span>
          </button>

          <button
            onClick={() => { setActiveTab('all'); setTierFilter('ALL'); }}
            className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#FF6400]/15 border-[#FF6400] text-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.15)]'
                : 'bg-black/40 border-white/5 text-white/40 hover:border-white/10 hover:text-white'
            }`}
          >
            <Grid className="w-5 h-5 mb-1 text-[#FF6400]" />
            <span className="text-xs font-black uppercase tracking-tight mt-1">All Checked</span>
            <span className="text-sm font-bold mt-2 font-mono">{totalChecked}</span>
          </button>
        </div>
      </div>

      {/* Database viewer & Exporter */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Results Data Table Left */}
        <div className="xl:col-span-8 bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden flex flex-col min-h-[420px] shadow-2xl">
          {/* Filters controls */}
          <div className="p-4 border-b border-white/5 bg-[#1F1F1F] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-sm font-black text-white uppercase tracking-tight font-sans">
                Filtered Data Grid ({processedAccounts.length})
              </span>

              {/* Keyword query */}
              <div className="relative max-w-full sm:max-w-xs flex-1">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Key search email/pass/card"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-white/20 font-sans focus:outline-none focus:border-[#FF6400]"
                />
              </div>
            </div>

            {/* Premium Tier + Country drop widgets */}
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-white/5 mt-1">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-white/30" />
                <span className="text-xs text-white/40 font-sans">Secondary Filters:</span>
              </div>

              {/* Class filters */}
              {activeTab === 'hits' && (
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-white/40 uppercase font-black tracking-wider font-sans">Tier:</span>
                  <select
                    value={tierFilter}
                    onChange={e => setTierFilter(e.target.value as any)}
                    className="bg-[#131313] border border-white/10 py-1 px-3 rounded-full text-xs font-sans text-slate-200 focus:outline-none focus:border-[#FF6400] font-bold"
                  >
                    <option value="ALL">All Tiers</option>
                    <option value="Fan">Fan Tier</option>
                    <option value="Mega Fan">Mega Fan Tier</option>
                    <option value="Ultimate Fan">Ultimate Fan Tier</option>
                  </select>
                </div>
              )}

              {/* Country select */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-white/40 uppercase font-black tracking-wider font-sans">Region:</span>
                <select
                  value={countryFilter}
                  onChange={e => setCountryFilter(e.target.value)}
                  className="bg-[#131313] border border-white/10 py-1 px-3 rounded-full text-xs font-sans text-slate-200 focus:outline-none focus:border-[#FF6400] font-bold"
                >
                  <option value="ALL">All Regions</option>
                  {availableCountries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table display */}
          <div className="flex-1 overflow-x-auto bg-[#151515]">
            {processedAccounts.length === 0 ? (
              <div className="p-16 text-center text-white/20 flex flex-col justify-center items-center h-full">
                <Layers className="w-9 h-9 text-white/10 stroke-1 mb-2 animate-pulse" />
                <p className="font-sans text-xs">No entries match the currently active query filters.</p>
              </div>
            ) : (
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead className="bg-[#131313] sticky top-0 border-b border-white/5 z-10">
                  <tr className="text-white/40 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-3 px-4 font-bold">Account Detail</th>
                    <th className="py-3 px-4 font-bold">Pass</th>
                    <th className="py-3 px-4 font-bold">Tier</th>
                    <th className="py-3 px-4 font-bold">Reg</th>
                    <th className="py-3 px-4 font-bold">Billing Details</th>
                    <th className="py-3 px-4 font-bold text-right">Proxy Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {processedAccounts.map((item) => (
                    <tr 
                      key={item.id} 
                      className="hover:bg-white/5 transition-colors border-l-2 border-transparent hover:border-[#FF6400]"
                    >
                      <td className="py-3 px-4 text-slate-200 font-mono font-bold truncate max-w-[180px]" title={item.email}>
                        {item.email}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-[120px] truncate" title={item.pass}>
                        {item.pass}
                      </td>
                      <td className="py-3 px-4">
                        {item.status === 'hit_premium' ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            item.tier === 'Ultimate Fan' ? 'bg-[#FF6400]/25 text-[#FF6400] border border-[#FF6400]/30' :
                            item.tier === 'Mega Fan' ? 'bg-orange-950/20 text-orange-400 border border-orange-900/40' :
                            'bg-violet-950/20 text-violet-400 border border-violet-900/40'
                          }`}>
                            {item.tier}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-sans font-black uppercase">{item.tier}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-semibold">{item.country}</td>
                      <td className="py-3 px-4 text-slate-400 max-w-[150px] truncate">
                        {item.status === 'hit_premium' ? (
                          <span className="text-[11px] font-medium" title={`${item.paymentMethod} (Next: ${item.nextBilling})`}>
                            {item.paymentMethod} • <span className="text-[10px] text-white/40 font-mono">{item.nextBilling}</span>
                          </span>
                        ) : item.status === 'error' ? (
                          <span className="text-rose-400 text-[10px] font-sans font-bold" title={item.errorMessage}>{item.errorMessage}</span>
                        ) : item.status === '2fa' ? (
                          <span className="text-amber-400 text-[10px] font-sans font-bold" title={item.errorMessage}>2FA Lock</span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-[10px] text-white/30 whitespace-nowrap font-mono font-medium">
                        {item.checkedByProxy ? (
                          <span className="truncate max-w-[120px] inline-block font-mono" title={item.checkedByProxy}>{item.checkedByProxy.split('://')[1] || item.checkedByProxy}</span>
                        ) : (
                          <span className="font-sans leading-none text-white/20 font-bold">Direct</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Synthesized Export Layout Right */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 pb-4 border-b border-white/5">
                <Sparkles className="text-[#FF6400] w-4.5 h-4.5" />
                <h3 className="text-sm font-black font-sans uppercase text-white tracking-tight">Formatting Exporter</h3>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-white/50 block mb-2.5 uppercase tracking-wide">
                    Output Layout syntax
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-start space-x-2 p-2.5 bg-black/40 hover:bg-white/5 border border-white/5 rounded-xl cursor-pointer transition-all">
                      <input
                        type="radio"
                        name="export_syntax"
                        checked={exportSyntax === 'captured_full'}
                        onChange={() => setExportSyntax('captured_full')}
                        className="mt-0.5 accent-[#FF6400]"
                      />
                      <div className="text-left">
                        <span className="block text-xs font-sans font-black text-slate-200 leading-none">Full Capture Syntax</span>
                        <span className="block text-[10px] font-mono text-white/40 mt-1 leading-normal">email:pass | Tier | Country | Billing | Payment | Profiles</span>
                      </div>
                    </label>

                    <label className="flex items-start space-x-2 p-2.5 bg-black/40 hover:bg-white/5 border border-white/5 rounded-xl cursor-pointer transition-all">
                      <input
                        type="radio"
                        name="export_syntax"
                        checked={exportSyntax === 'captured_simple'}
                        onChange={() => setExportSyntax('captured_simple')}
                        className="mt-0.5 accent-[#FF6400]"
                      />
                      <div className="text-left">
                        <span className="block text-xs font-sans font-black text-slate-200 leading-none">Compact Capture Syntax</span>
                        <span className="block text-[10px] font-mono text-white/40 mt-1 leading-normal">email:pass | Tier | Expiry</span>
                      </div>
                    </label>

                    <label className="flex items-start space-x-2 p-2.5 bg-black/40 hover:bg-white/5 border border-white/5 rounded-xl cursor-pointer transition-all">
                      <input
                        type="radio"
                        name="export_syntax"
                        checked={exportSyntax === 'basic'}
                        onChange={() => setExportSyntax('basic')}
                        className="mt-0.5 accent-[#FF6400]"
                      />
                      <div className="text-left">
                        <span className="block text-xs font-sans font-black text-slate-200 leading-none">Legacy Combo Format</span>
                        <span className="block text-[10px] font-mono text-white/40 mt-1 leading-normal">email:pass</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-white/50 block mb-2.5 uppercase tracking-wide">
                    Live Export Preview
                  </span>
                  <div className="w-full bg-black/40 border border-white/5 p-3 rounded-xl h-36 overflow-y-auto">
                    {processedAccounts.length === 0 ? (
                      <span className="text-[11px] text-white/20 font-mono italic">Exporter output preview empty. Check accounts first.</span>
                    ) : (
                      <pre className="text-[10px] font-mono text-[#FF6400] leading-relaxed truncate whitespace-pre font-bold">{getOutputText(processedAccounts.slice(0, 10))}</pre>
                    )}
                    {processedAccounts.length > 10 && (
                      <span className="text-[10px] text-white/30 italic block mt-1.5 pt-1.5 border-t border-white/5">...and {processedAccounts.length - 10} more lines in download</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={handleCopy}
                disabled={processedAccounts.length === 0}
                className="flex-1 py-3 px-4 bg-[#2A2A2A] border border-white/5 hover:bg-[#333] text-slate-200 text-xs font-bold rounded-full transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy List</span>
              </button>
              <button
                onClick={handleDownload}
                disabled={processedAccounts.length === 0}
                className="flex-1 py-3 px-4 bg-[#FF6400] hover:bg-white text-black text-xs font-black rounded-full transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer uppercase"
              >
                <Download className="w-3.5 h-3.5 stroke-[3]" />
                <span>Download txt</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
