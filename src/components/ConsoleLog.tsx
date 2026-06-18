import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, ShieldCheck, ArrowDown, RefreshCw } from 'lucide-react';
import { LogEntry } from '../types';

interface ConsoleLogProps {
  logs: LogEntry[];
  clearLogs: () => void;
}

export function ConsoleLog({ logs, clearLogs }: ConsoleLogProps) {
  const [filter, setFilter] = useState<'ALL' | 'success' | 'warning' | 'error' | 'info'>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'ALL') return true;
    return log.type === filter;
  });

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'warning': return 'text-amber-400';
      case 'error': return 'text-rose-400';
      case 'debug': return 'text-slate-500 font-normal';
      default: return 'text-sky-300';
    }
  };

  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl flex flex-col h-[480px] overflow-hidden shadow-2xl" id="console-logs-section">
      {/* Logger Top Panel */}
      <div className="p-4 border-b border-white/5 bg-[#1A1A1A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-[#FF6400]" />
          <h3 className="text-sm font-black font-sans text-white uppercase tracking-tight">Developer Logging Stream</h3>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2.5">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="bg-[#131313] border border-white/10 py-1 px-2.5 rounded-full text-xs font-sans text-slate-300 focus:outline-none focus:border-[#FF6400] font-bold"
          >
            <option value="ALL">Show All Streams</option>
            <option value="success">Success / Hit Logs</option>
            <option value="info">System Info</option>
            <option value="warning">Connection Warnings</option>
            <option value="error">Failed Attempts</option>
          </select>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-2 border rounded-full transition-colors flex items-center cursor-pointer ${
              autoScroll 
                ? 'bg-[#FF6400]/25 border-[#FF6400] text-[#FF6400]' 
                : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Autoscroll"
          >
            <ArrowDown className={`w-3.5 h-3.5 ${autoScroll ? 'animate-bounce' : ''}`} />
          </button>

          <button
            onClick={clearLogs}
            className="p-1.5 bg-[#2A2A2A] hover:bg-[#333] border border-white/5 rounded-full text-rose-450 hover:text-rose-300 transition-colors"
            title="Flush logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs output window */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 p-4 bg-black/40 font-mono text-xs overflow-y-auto space-y-1.5 leading-relaxed selection:bg-[#FF6400] selection:text-black"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/20 py-12">
            <ShieldCheck className="w-9 h-9 stroke-1 mb-2 text-white/10 animate-pulse" />
            <p className="font-sans text-xs">Waiting for diagnostic checker activity to stream logs...</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start hover:bg-white/5 py-0.5 rounded px-1 transition-colors">
              <span className="text-white/20 mr-2.5 shrink-0 select-none">
                [{log.timestamp}]
              </span>
              <span className={`uppercase font-bold text-[10px] mr-2 px-1 rounded select-none shrink-0 border ${
                log.type === 'success' ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400' :
                log.type === 'warning' ? 'bg-amber-950/20 border-amber-900/40 text-amber-400' :
                log.type === 'error' ? 'bg-rose-950/20 border-rose-900/40 text-rose-400' :
                log.type === 'debug' ? 'bg-[#222] border-white/5 text-slate-500' :
                'bg-[#FF6400]/20 border-[#FF6400]/30 text-[#FF6400]'
              }`}>
                {log.type}
              </span>
              <span className={`${getLogColor(log.type)} break-all`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Status indicator bottom */}
      <div className="bg-[#131313] px-4 py-2.5 border-t border-white/5 flex items-center justify-between text-[11px] font-bold text-white/40">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-[#FF6400] rounded-full animate-ping" />
          <span>Stream Live Connection Listeners</span>
        </div>
        <span>{filteredLogs.length} Records displayed</span>
      </div>
    </div>
  );
}
