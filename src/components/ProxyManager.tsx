import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Globe, 
  UploadCloud, 
  Trash2, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Copy, 
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { ProxyItem, ProxyType, ProxyStatus } from '../types';
import { parseProxies, serializeProxy } from '../utils/proxyParser';

interface ProxyManagerProps {
  proxies: ProxyItem[];
  setProxies: React.Dispatch<React.SetStateAction<ProxyItem[]>>;
  addLog: (type: 'info' | 'success' | 'warning' | 'error' | 'debug', msg: string) => void;
}

export function ProxyManager({ proxies, setProxies, addLog }: ProxyManagerProps) {
  const [rawInput, setRawInput] = useState('');
  const [defaultType, setDefaultType] = useState<ProxyType>('HTTP');
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProxyStatus | 'ALL'>('ALL');
  const [testingProgress, setTestingProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse proxies on button click
  const handleImport = () => {
    if (!rawInput.trim()) return;
    const parsed = parseProxies(rawInput, defaultType);
    if (parsed.length === 0) {
      addLog('warning', 'No valid proxies found in the input parsing attempt.');
      return;
    }

    const newProxies: ProxyItem[] = parsed.map((item, idx) => ({
      ...item,
      id: `proxy_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
    }));

    setProxies(prev => {
      // Avoid raw duplicates
      const existingKeys = new Set(prev.map(p => `${p.type}://${p.host}:${p.port}`));
      const uniqueNew = newProxies.filter(p => !existingKeys.has(`${p.type}://${p.host}:${p.port}`));
      addLog('success', `Successfully imported ${uniqueNew.length} unique proxies (${newProxies.length - uniqueNew.length} duplicates filtered).`);
      return [...prev, ...uniqueNew];
    });

    setRawInput('');
  };

  // Upload file parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseProxies(text, defaultType);
        if (parsed.length > 0) {
          const newProxies: ProxyItem[] = parsed.map((item, idx) => ({
            ...item,
            id: `proxy_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
          }));
          setProxies(prev => {
            const existingKeys = new Set(prev.map(p => `${p.type}://${p.host}:${p.port}`));
            const uniqueNew = newProxies.filter(p => !existingKeys.has(`${p.type}://${p.host}:${p.port}`));
            addLog('success', `Imported ${uniqueNew.length} proxies from file "${file.name}".`);
            return [...prev, ...uniqueNew];
          });
        } else {
          addLog('error', `Could not parse any valid proxies from target file: ${file.name}`);
        }
      }
    };
    reader.readAsText(file);
  };

  // Drag and Drop files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseProxies(text, defaultType);
        if (parsed.length > 0) {
          const newProxies: ProxyItem[] = parsed.map((item, idx) => ({
            ...item,
            id: `proxy_${Date.now()}_${idx}`,
          }));
          setProxies(prev => {
            const existingKeys = new Set(prev.map(p => `${p.type}://${p.host}:${p.port}`));
            const uniqueNew = newProxies.filter(p => !existingKeys.has(`${p.type}://${p.host}:${p.port}`));
            addLog('success', `Dropped and loaded ${uniqueNew.length} proxies from file "${file.name}".`);
            return [...prev, ...uniqueNew];
          });
        }
      }
    };
    reader.readAsText(file);
  };

  // Real Proxy Checker Diagnostics
  const startProxyTester = async () => {
    if (proxies.length === 0) {
      addLog('warning', 'Please import proxies first to run latency diagnostics.');
      return;
    }

    setTestingProgress(true);
    addLog('info', `Initializing real-time connection diagnostics for ${proxies.length} proxies...`);

    const batchSize = 10;
    const arrayCopy = [...proxies];

    for (let i = 0; i < arrayCopy.length; i += batchSize) {
      const batch = arrayCopy.slice(i, i + batchSize);
      
      // Set to testing status
      setProxies(current => 
        current.map(p => 
          batch.some(b => b.id === p.id) ? { ...p, status: 'testing' } : p
        )
      );

      // Run parallel health tests against our Express Proxy validator endpoint
      const results = await Promise.all(
        batch.map(async (p) => {
          try {
            const resp = await fetch('/api/test-proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                host: p.host,
                port: p.port,
                type: p.type,
                username: p.username,
                password: p.password
              }),
            });
            const data = await resp.json();
            if (data.status === 'alive') {
              return { id: p.id, status: 'alive' as const, ping: data.ping };
            } else {
              return { id: p.id, status: 'dead' as const, ping: undefined, errorMessage: data.error || 'Connection Failed' };
            }
          } catch (err: any) {
            return { id: p.id, status: 'dead' as const, ping: undefined, errorMessage: err.message || 'Server Gateway Error' };
          }
        })
      );

      // Apply findings to state
      setProxies(current => 
        current.map(p => {
          const res = results.find(r => r.id === p.id);
          if (res) {
            return { 
              ...p, 
              status: res.status, 
              ping: res.ping, 
              errorMessage: (res as any).errorMessage 
            };
          }
          return p;
        })
      );
    }

    setTestingProgress(false);
    addLog('success', 'Real networks diagnostics completed. Active live endpoints tagged successfully.');
  };

  // Copy alive proxies
  const copyAlive = () => {
    const alive = proxies.filter(p => p.status === 'alive');
    if (alive.length === 0) {
      addLog('warning', 'No tested "ALIVE" proxies currently available to copy.');
      return;
    }
    const lines = alive.map(p => serializeProxy(p, 'standard')).join('\n');
    navigator.clipboard.writeText(lines);
    addLog('success', `Copied ${alive.length} alive proxies to clipboard!`);
  };

  // Clear proxies list
  const clearAll = () => {
    setProxies([]);
    addLog('info', 'Proxy list completely flushed.');
  };

  // Calculations for filters
  const filteredProxies = proxies.filter(p => {
    const matchesSearch = p.host.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.port.toString().includes(searchQuery) ||
                          (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  });

  const countUntested = proxies.filter(p => p.status === 'untested').length;
  const countAlive = proxies.filter(p => p.status === 'alive').length;
  const countDead = proxies.filter(p => p.status === 'dead').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="proxy-manager-section">
      {/* Input panel Left */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center space-x-2 pb-4 border-b border-white/5">
            <Globe className="w-5 h-5 text-[#FF6400]" />
            <h2 className="text-lg font-black tracking-tight text-white font-sans uppercase">Proxy Importer Laboratory</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-[11px] font-bold text-white/50 block mb-1.5 uppercase tracking-wide">
                Default Proxy Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['HTTP', 'HTTPS', 'SOCKS4', 'SOCKS5'] as ProxyType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setDefaultType(type)}
                    className={`py-2 px-1 text-center rounded-lg font-mono text-xs font-bold transition-all border ${
                      defaultType === type
                        ? 'bg-[#FF6400]/20 border-[#FF6400] text-[#FF6400]'
                        : 'bg-black/40 border-white/5 text-white/40 hover:bg-white/5'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/50 block mb-1.5 uppercase tracking-wide">
                Paste Proxies (one per line)
              </label>
              <textarea
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                placeholder="192.168.1.1:8080&#10;192.168.1.2:8080:username:password&#10;socks5://185.22.4.2:1080"
                className="w-full h-44 bg-black/40 text-slate-200 font-mono text-xs border border-white/5 p-3 rounded-xl focus:outline-none focus:border-[#FF6400] transition-colors placeholder:text-white/20 resize-none"
              />
            </div>

            {/* Drag & Drop File */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#FF6400] bg-[#FF6400]/10 text-[#FF6400]'
                  : 'border-white/10 bg-black/20 text-white/40 hover:border-white/20 hover:text-white/60'
              }`}
            >
              <UploadCloud className="w-8 h-8 mb-2 animate-bounce text-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.2)]" />
              <span className="text-xs font-bold text-center tracking-normal">
                Drag & Drop proxy list file (.txt)
              </span>
              <span className="text-[10px] text-white/40 font-mono mt-1">
                or click to search system
              </span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt"
                className="hidden"
              />
            </div>

            {/* Multi Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleImport}
                disabled={!rawInput.trim()}
                className="flex-1 bg-[#FF6400] hover:bg-white text-black font-sans text-xs font-black py-2.5 px-4 rounded-full shadow-lg hover:shadow-[0_0_15px_rgba(255,100,0,0.25)] transition-all duration-200 uppercase disabled:opacity-45"
              >
                Parse & Format
              </button>
              <button
                onClick={clearAll}
                disabled={proxies.length === 0}
                className="p-2.5 bg-[#2A2A2A] hover:bg-[#333] border border-white/5 rounded-full text-rose-450 hover:text-rose-300 disabled:opacity-40 transition-all duration-200"
                title="Flush Proxy List"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Diagnostic speed dial */}
        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="text-xs uppercase font-black text-white/50 tracking-wider">Diagnostic Control</h3>
            <span className="font-mono text-[10px] bg-[#FF6400]/10 px-3 py-1 rounded-full border border-[#FF6400]/25 text-[#FF6400] font-bold">
              {proxies.length} Total
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-[#131313] p-2.5 border border-white/5 rounded-xl">
              <span className="block text-xs text-white/40 font-medium font-sans">Untested</span>
              <span className="block text-sm font-bold font-mono text-white/80 mt-0.5">{countUntested}</span>
            </div>
            <div className="bg-[#131313] p-2.5 border border-white/5 rounded-xl">
              <span className="block text-xs text-emerald-450 font-medium font-sans">Alive</span>
              <span className="block text-sm font-bold font-mono text-emerald-400 mt-0.5">{countAlive}</span>
            </div>
            <div className="bg-[#131313] p-2.5 border border-white/5 rounded-xl">
              <span className="block text-xs text-rose-450 font-bold font-sans">Dead</span>
              <span className="block text-sm font-bold font-mono text-rose-450 mt-0.5">{countDead}</span>
            </div>
          </div>
          
          <div className="mt-4 flex gap-3">
            <button
              onClick={startProxyTester}
              disabled={testingProgress || proxies.length === 0}
              className="flex-1 bg-emerald-500 hover:bg-emerald-450 text-black font-sans text-xs font-black py-2.5 px-4 rounded-full shadow-lg transition-all flex items-center justify-center space-x-1.5 disabled:opacity-40 uppercase cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{testingProgress ? 'Testing...' : 'Run Diagnostics'}</span>
            </button>
            <button
              onClick={copyAlive}
              disabled={countAlive === 0}
              className="px-4 py-2.5 bg-[#2A2A2A] border border-white/5 hover:border-white/10 text-white rounded-full transition-colors flex items-center justify-center cursor-pointer font-bold"
              title="Copy verified alive proxies"
            >
              <Copy className="w-4 h-4 mr-1 text-[#FF6400]" />
              <span className="text-xs">Copy Live</span>
            </button>
          </div>
        </div>
      </div>

      {/* Library list Right */}
      <div className="lg:col-span-7 flex flex-col h-full min-h-[400px]">
        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl">
          {/* Header & filters */}
          <div className="p-4 border-b border-white/5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-black font-sans text-white uppercase tracking-tight">Proxy Library</h3>
              
              {/* Search bar */}
              <div className="relative max-w-full sm:max-w-xs flex-1">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Filter host ip, port..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-full pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-white/20 font-sans focus:outline-none focus:border-[#FF6400]"
                />
              </div>
            </div>

            {/* Quick Filter tabs */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`text-[11px] font-bold py-1 px-3.5 rounded-full border transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-[#FF6400]/25 border-[#FF6400] text-[#FF6400]'
                    : 'bg-black/45 border-white/5 text-white/40 hover:text-white'
                }`}
              >
                All ({proxies.length})
              </button>
              <button
                onClick={() => setStatusFilter('untested')}
                className={`text-[11px] font-bold py-1 px-3.5 rounded-full border transition-all ${
                  statusFilter === 'untested'
                    ? 'bg-white/5 border-white/5 text-white/55'
                    : 'bg-black/45 border-white/5 text-white/40 hover:text-white'
                }`}
              >
                Untested ({countUntested})
              </button>
              <button
                onClick={() => setStatusFilter('alive')}
                className={`text-[11px] font-bold py-1 px-3.5 rounded-full border transition-all ${
                  statusFilter === 'alive'
                    ? 'bg-emerald-950/50 border-emerald-900/60 text-emerald-400'
                    : 'bg-black/45 border-white/5 text-white/40 hover:text-white'
                }`}
              >
                Alive ({countAlive})
              </button>
              <button
                onClick={() => setStatusFilter('dead')}
                className={`text-[11px] font-bold py-1 px-3.5 rounded-full border transition-all ${
                  statusFilter === 'dead'
                    ? 'bg-[#FF6400]/10 border-[#FF6400]/25 text-[#FF6400]'
                    : 'bg-black/45 border-white/5 text-white/40 hover:text-white'
                }`}
              >
                Dead ({countDead})
              </button>
            </div>
          </div>

          {/* Table display */}
          <div className="flex-1 overflow-y-auto max-h-[460px] bg-black/10">
            {filteredProxies.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-10 h-10 mx-auto text-white/10 stroke-1 mb-2.5" />
                <p className="text-white/40 text-xs font-sans">No proxies match the current filter selection.</p>
              </div>
            ) : (
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead className="bg-[#131313] sticky top-0 border-b border-white/5">
                  <tr className="text-white/40 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-3 px-4 font-bold">Endpoint</th>
                    <th className="py-3 px-4 font-bold">Protocol</th>
                    <th className="py-3 px-4 font-bold">Auth</th>
                    <th className="py-3 px-4 font-bold text-right">Latency / Msg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredProxies.map((proxy) => (
                    <tr 
                      key={proxy.id} 
                      className="hover:bg-white/5 transition-colors border-l-2 border-transparent hover:border-[#FF6400]"
                    >
                      <td className="py-3 px-4 font-medium text-slate-200 font-mono">
                        {proxy.host}:{proxy.port}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          proxy.type === 'SOCKS5' ? 'bg-[#FF6400]/20 text-[#FF6400] border border-[#FF6400]/30' :
                          proxy.type === 'SOCKS4' ? 'bg-[#FF6400]/10 text-white border border-white/10' :
                          proxy.type === 'HTTPS' ? 'bg-zinc-800 text-slate-300 border border-white/5' :
                          'bg-zinc-900 text-slate-400 border border-white/5'
                        }`}>
                          {proxy.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white/30">
                        {proxy.username ? <span className="text-emerald-400 font-sans font-bold">Yes</span> : <span className="text-white/20 font-sans font-bold">None</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {proxy.status === 'untested' && (
                          <span className="text-[10px] bg-[#222] border border-white/5 text-white/40 py-0.5 px-2 rounded-full font-sans font-medium">
                            untested
                          </span>
                        )}
                        {proxy.status === 'testing' && (
                          <span className="text-[10px] bg-[#FF6400]/20 border border-[#FF6400]/40 text-[#FF6400] py-0.5 px-2 rounded-full font-sans font-medium animate-pulse">
                            testing...
                          </span>
                        )}
                        {proxy.status === 'alive' && (
                          <span className="text-[10px] bg-emerald-950/50 border border-emerald-900/60 text-emerald-400 py-0.5 px-2 rounded-full font-mono font-bold">
                            {proxy.ping} ms
                          </span>
                        )}
                        {proxy.status === 'dead' && (
                          <span
                            className="text-[10px] bg-rose-950/60 border border-rose-900/60 text-rose-400 py-0.5 px-2 rounded-full font-sans font-medium inline-block max-w-[120px] truncate"
                            title={proxy.errorMessage}
                          >
                            timeout
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
