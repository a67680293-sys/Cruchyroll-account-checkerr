import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  Cpu, 
  Clock, 
  HelpCircle, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Zap, 
  Info, 
  RotateCcw
} from 'lucide-react';
import { CheckerConfig } from '../types';

interface SettingsPanelProps {
  config: CheckerConfig;
  setConfig: React.Dispatch<React.SetStateAction<CheckerConfig>>;
  addLog: (type: 'info' | 'success' | 'warning' | 'error' | 'debug', msg: string) => void;
}

export function SettingsPanel({ config, setConfig, addLog }: SettingsPanelProps) {
  const [headerKey, setHeaderKey] = useState('');
  const [headerVal, setHeaderVal] = useState('');

  const updateField = <K extends keyof CheckerConfig>(key: K, value: CheckerConfig[K]) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const addHeader = () => {
    if (!headerKey.trim() || !headerVal.trim()) return;
    
    // Check key duplicate
    const keyExists = config.customHeaders.some(h => h.key.toLowerCase() === headerKey.trim().toLowerCase());
    if (keyExists) {
      addLog('warning', `Header "${headerKey}" is already configured. Remove first to replace.`);
      return;
    }

    const updated = [...config.customHeaders, { key: headerKey.trim(), value: headerVal.trim() }];
    updateField('customHeaders', updated);
    addLog('info', `Injecting custom request header: [${headerKey.trim()}]`);
    setHeaderKey('');
    setHeaderVal('');
  };

  const removeHeader = (keyToRemove: string) => {
    const updated = config.customHeaders.filter(h => h.key !== keyToRemove);
    updateField('customHeaders', updated);
    addLog('info', `Removed custom request header: [${keyToRemove}]`);
  };

  const restoreDefaultHeaders = () => {
    const defaults = [
      { key: 'User-Agent', value: 'Crunchyroll/3.34.1 Android/11 (Pixel 5; Build/RQ3A.210605.005)' },
      { key: 'Accept-Language', value: 'en-US,en;q=0.9' },
      { key: 'Content-Type', value: 'application/x-www-form-urlencoded' },
      { key: 'Authorization', value: 'Basic a3NuYm9pcGZjc3BxeG9vNm9sY2g6' },
      { key: 'X-Crunchyroll-Locale', value: 'enUS' },
    ];
    updateField('customHeaders', defaults);
    addLog('success', 'Restored typical Crunchyroll Mobile Client requests signatures!');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="settings-panel-section">
      {/* Settings Controls Left */}
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 shadow-2xl">
          <div className="flex items-center space-x-2 pb-4 border-b border-white/5">
            <Settings className="w-5 h-5 text-[#FF6400]" />
            <h2 className="text-lg font-black font-sans uppercase text-white tracking-tight">Checker Engine Configurations</h2>
          </div>

          <div className="mt-5 space-y-5">
            {/* Mode Toggle */}
            <div>
              <span className="text-[11px] font-bold text-white/50 block mb-2 uppercase tracking-wide">
                Routing Mode
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    updateField('mode', 'auto');
                    addLog('success', 'Server Managed Dynamic Auto-Rotation pool ENGAGED. No manual proxies are required!');
                  }}
                  className={`py-2.5 px-3 rounded-xl border font-sans text-xs font-bold transition-all text-center flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                    config.mode === 'auto'
                      ? 'bg-[#FF6400]/15 border-[#FF6400] text-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.15)]'
                      : 'bg-black/40 border-white/5 text-white/40 hover:border-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-black uppercase">Server Auto-Rotate</span>
                  <span className="text-[10px] font-medium opacity-65">Zero inputs required (Fast)</span>
                </button>
                <button
                  onClick={() => {
                    updateField('mode', 'proxy');
                    addLog('info', 'Active testing mode switched to CUSTOM PROXY-ROTATED. Connections will cycle your uploaded list.');
                  }}
                  className={`py-2.5 px-3 rounded-xl border font-sans text-xs font-bold transition-all text-center flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                    config.mode === 'proxy'
                      ? 'bg-[#FF6400]/15 border-[#FF6400] text-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.15)]'
                      : 'bg-black/40 border-white/5 text-white/40 hover:border-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-black uppercase">Custom Proxies</span>
                  <span className="text-[10px] font-medium opacity-65">Cycles uploaded list</span>
                </button>
                <button
                  onClick={() => {
                    updateField('mode', 'proxyless');
                    addLog('warning', 'Switched to PROXYLESS mode. Please verify you stay within normal API query limits.');
                  }}
                  className={`py-2.5 px-3 rounded-xl border font-sans text-xs font-bold transition-all text-center flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                    config.mode === 'proxyless'
                      ? 'bg-[#FF6400]/15 border-[#FF6400] text-[#FF6400] shadow-[0_0_15px_rgba(255,100,0,0.15)]'
                      : 'bg-black/40 border-white/5 text-white/40 hover:border-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-black uppercase">Proxyless Direct</span>
                  <span className="text-[10px] font-medium opacity-65">Direct gateway request</span>
                </button>
              </div>
            </div>

              {/* Live Status Educational Mode toggler */}
            <div className="bg-[#131313] p-4 border border-emerald-500/20 rounded-xl space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0"></div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-white/90 font-sans">Verification Engine</span>
                  <Info className="w-3.5 h-3.5 text-emerald-500/80 cursor-help" title="Accounts are verified directly on real Crunchyroll servers" />
                </div>
                <span className="text-[10px] bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 py-0.5 px-2.5 rounded-full font-bold uppercase tracking-wider font-mono">
                  Real-Time Live Gateway
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed font-sans">
                Authenticating raw credentials lists directly in a browser environment can be limited by CORS. All verifications are securely proxied through the dedicated Node Server Gateway.
              </p>
            </div>

            {/* Audio beep alert toggle control */}
            <div className="space-y-2">
              <div className="bg-black/30 p-3.5 border border-white/5 rounded-xl flex items-center justify-between shadow-inner">
                 <div className="flex flex-col pr-4">
                   <span className="text-xs font-bold text-white/70 font-sans">Audio Beep Alerts on Hits</span>
                   <p className="text-[10px] text-white/30 font-sans mt-0.5">Plays an interactive synthesized double-tone success chime on hits.</p>
                 </div>
                 
                 <button
                   onClick={() => {
                     updateField('soundOnHit', !config.soundOnHit);
                     addLog('info', `Capture success beep notification: ${!config.soundOnHit ? 'ENABLED' : 'MUTED'}`);
                   }}
                   className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer outline-none shrink-0 ${
                     config.soundOnHit ? 'bg-[#FF6400]' : 'bg-white/10'
                   }`}
                 >
                   <motion.div
                     layout
                     className="bg-black w-4 h-4 rounded-full shadow-md"
                     animate={{ x: config.soundOnHit ? 20 : 0 }}
                     transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                   />
                 </button>
              </div>

              <div className="bg-black/30 p-3.5 border border-white/5 rounded-xl flex items-center justify-between shadow-inner">
                 <div className="flex flex-col pr-4">
                   <span className="text-xs font-bold text-white/70 font-sans">Linear Proxy Backoff</span>
                   <p className="text-[10px] text-white/30 font-sans mt-0.5">Increases cooldown duration exponentially for repeat offenders.</p>
                 </div>
                 
                 <button
                   onClick={() => updateField('proxyLinearBackoff', !config.proxyLinearBackoff)}
                   className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer outline-none shrink-0 ${
                     config.proxyLinearBackoff ? 'bg-[#FF6400]' : 'bg-white/10'
                   }`}
                 >
                   <motion.div
                     layout
                     className="bg-black w-4 h-4 rounded-full shadow-md"
                     animate={{ x: config.proxyLinearBackoff ? 20 : 0 }}
                     transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                   />
                 </button>
              </div>

              <div className="bg-black/30 p-3.5 border border-white/5 rounded-xl flex items-center justify-between shadow-inner">
                 <div className="flex flex-col pr-4">
                   <span className="text-xs font-bold text-white/70 font-sans">Aggressive Auto-Recovery</span>
                   <p className="text-[10px] text-white/30 font-sans mt-0.5">Forces workers to wait for healthy proxies instead of failing fast.</p>
                 </div>
                 
                 <button
                   onClick={() => updateField('aggressiveRecovery', !config.aggressiveRecovery)}
                   className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer outline-none shrink-0 ${
                     config.aggressiveRecovery ? 'bg-[#FF6400]' : 'bg-white/10'
                   }`}
                 >
                   <motion.div
                     layout
                     className="bg-black w-4 h-4 rounded-full shadow-md"
                     animate={{ x: config.aggressiveRecovery ? 20 : 0 }}
                     transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                   />
                 </button>
              </div>

              <div className="bg-black/30 p-3.5 border border-white/5 rounded-xl flex items-center justify-between shadow-inner">
                 <div className="flex flex-col pr-4">
                   <span className="text-xs font-bold text-white/70 font-sans">Bio-mimetic Jitter</span>
                   <p className="text-[10px] text-white/30 font-sans mt-0.5">Mimics human typing and network variability with non-uniform delays.</p>
                 </div>
                 
                 <button
                   onClick={() => updateField('biomimeticDelay', !config.biomimeticDelay)}
                   className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer outline-none shrink-0 ${
                     config.biomimeticDelay ? 'bg-[#FF6400]' : 'bg-white/10'
                   }`}
                 >
                   <motion.div
                     layout
                     className="bg-black w-4 h-4 rounded-full shadow-md"
                     animate={{ x: config.biomimeticDelay ? 20 : 0 }}
                     transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                   />
                 </button>
              </div>

              <div className="bg-black/30 p-3.5 border border-white/5 rounded-xl flex items-center justify-between shadow-inner">
                 <div className="flex flex-col pr-4">
                   <span className="text-xs font-bold text-white/70 font-sans">Hardware Spoofing</span>
                   <p className="text-[10px] text-white/30 font-sans mt-0.5">Generates unique, realistic hardware fingerprints for every account.</p>
                 </div>
                 
                 <button
                   onClick={() => updateField('hardwareSpoofing', !config.hardwareSpoofing)}
                   className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer outline-none shrink-0 ${
                     config.hardwareSpoofing ? 'bg-[#FF6400]' : 'bg-white/10'
                   }`}
                 >
                   <motion.div
                     layout
                     className="bg-black w-4 h-4 rounded-full shadow-md"
                     animate={{ x: config.hardwareSpoofing ? 20 : 0 }}
                     transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                   />
                 </button>
              </div>

              <div className="bg-black/30 p-3.5 border border-white/5 rounded-xl flex items-center justify-between shadow-inner">
                 <div className="flex flex-col pr-4">
                   <span className="text-xs font-bold text-white/70 font-sans">Auto-Prune Poisoned Nodes</span>
                   <p className="text-[10px] text-white/30 font-sans mt-0.5">Instantly removes proxies that return consecutive socket resets.</p>
                 </div>
                 
                 <button
                   onClick={() => updateField('autoPruneDead', !config.autoPruneDead)}
                   className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer outline-none shrink-0 ${
                     config.autoPruneDead ? 'bg-[#FF6400]' : 'bg-white/10'
                   }`}
                 >
                   <motion.div
                     layout
                     className="bg-black w-4 h-4 rounded-full shadow-md"
                     animate={{ x: config.autoPruneDead ? 20 : 0 }}
                     transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                   />
                 </button>
              </div>
            </div>

            {/* Advanced External Integration */}
            <div className="space-y-4 pt-2">
               <h3 className="text-[10px] uppercase font-black tracking-[0.2em] text-white/20 mb-2">External Logic & Sync</h3>
               <div className="space-y-3">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Discord/Webhook URL</label>
                    <input 
                      type="text" 
                      placeholder="https://discord.com/api/webhooks/..."
                      value={config.webhookUrl || ''}
                      onChange={(e) => updateField('webhookUrl', e.target.value)}
                      className="bg-black/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/10 outline-none focus:border-[#FF6400]/30 transition-all font-mono"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Custom Export Template</label>
                    <input 
                      type="text" 
                      placeholder="{email}:{pass} | {tier} | {country}"
                      value={config.exportTemplate || ''}
                      onChange={(e) => updateField('exportTemplate', e.target.value)}
                      className="bg-black/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/10 outline-none focus:border-[#FF6400]/30 transition-all font-mono"
                    />
                    <p className="text-[8px] text-white/20 pl-1 italic">Tokens: email, pass, tier, country, profiles, expiry</p>
                  </div>
               </div>
            </div>

            {/* Thread Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white/50 uppercase tracking-wider flex items-center gap-1 font-sans">
                  <Cpu className="w-3.5 h-3.5 text-[#FF6400]" /> Checker Speed (Threads)
                </span>
                <span className="font-mono bg-black/40 py-0.5 px-2.5 rounded-full border border-white/5 text-[#FF6400] font-bold text-[11px]">
                  {config.threads} Workers
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={config.threads}
                onChange={e => updateField('threads', parseInt(e.target.value))}
                className="w-full accent-[#FF6400] cursor-pointer h-1 bg-black/40 rounded-lg outline-none"
              />
              <span className="text-[10px] text-white/30 block leading-tight font-sans">
                Controls the maximum concurrent connection workers running in the loop.
              </span>
            </div>

            {/* Delay Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white/50 uppercase tracking-wider flex items-center gap-1 font-sans">
                  <Clock className="w-3.5 h-3.5 text-[#FF6400]" /> Request Delay (Latency)
                </span>
                <span className="font-mono bg-black/40 py-0.5 px-2.5 rounded-full border border-white/5 text-[#FF6400] font-bold text-[11px]">
                  {config.delay} ms
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={config.delay}
                onChange={e => updateField('delay', parseInt(e.target.value))}
                className="w-full accent-[#FF6400] cursor-pointer h-1 bg-black/40 rounded-lg outline-none"
              />
              <span className="text-[10px] text-white/30 block leading-tight font-sans">
                Artificial delay injected before launching next thread queue. Bypasses rate-limits.
              </span>
            </div>

            {/* Timeout Slider */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                  Socket Timeout
                </span>
                <select
                  value={config.timeout}
                  onChange={e => updateField('timeout', parseInt(e.target.value))}
                  className="w-full bg-[#131313] border border-white/5 py-1.5 px-2.5 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-[#FF6400]"
                >
                  <option value={1000}>1,000 ms (Fast)</option>
                  <option value={3000}>3,000 ms (Default)</option>
                  <option value={5000}>5,000 ms (Conservative)</option>
                  <option value={10000}>10,000 ms (Safe)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                  Proxy Retry Count
                </span>
                <select
                  value={config.retries}
                  onChange={e => updateField('retries', parseInt(e.target.value))}
                  className="w-full bg-[#131313] border border-white/5 py-1.5 px-2.5 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-[#FF6400]"
                >
                  <option value={0}>No Retries</option>
                  <option value={1}>1 Retry</option>
                  <option value={2}>2 Retries</option>
                  <option value={3}>3 Retries</option>
                  <option value={5}>5 Retries</option>
                </select>
              </div>
            </div>

            {/* User agent type selector */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                Signature Device Agent
              </span>
              <select
                value={config.userAgentType}
                onChange={e => {
                  updateField('userAgentType', e.target.value as any);
                  addLog('info', `App client signature set to rotate: ${e.target.value}`);
                }}
                className="w-full bg-[#131313] border border-white/5 py-1.5 px-2.5 rounded-xl text-xs font-sans text-slate-200 focus:outline-none focus:border-[#FF6400]"
              >
                <option value="Mobile Android">Android App Client (Recommended)</option>
                <option value="Mobile iOS">Apple iOS App Client</option>
                <option value="Web Chrome">Desktop Chrome Browser</option>
                <option value="Web Firefox">Desktop Firefox Browser</option>
                <option value="Random">Randomly Rotate Signatures</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* HTTP Signature Left Column Right */}
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 shadow-2xl h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center space-x-2">
                <Zap className="text-[#FF6400] w-4.5 h-4.5" />
                <h3 className="text-sm font-black font-sans uppercase text-white tracking-tight">API Reverse Headers Injector</h3>
              </div>
              <button
                onClick={restoreDefaultHeaders}
                className="text-[10px] text-[#FF6400] hover:text-white transition-colors flex items-center space-x-1 font-bold cursor-pointer uppercase"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Defaults</span>
              </button>
            </div>

            <p className="text-[11px] text-white/40 mt-3 leading-relaxed font-sans">
              To check Crunchyroll credentials, client requests must carry authentication tokens matching specific devices formats. Below is the list of headers injected into each check thread:
            </p>

            {/* Custom header builder input */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <input
                type="text"
                placeholder="Header Name"
                value={headerKey}
                onChange={e => setHeaderKey(e.target.value)}
                className="bg-black/40 text-slate-200 border border-white/5 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-[#FF6400]"
              />
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Value"
                  value={headerVal}
                  onChange={e => setHeaderVal(e.target.value)}
                  className="flex-1 bg-black/40 text-slate-200 border border-white/5 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-[#FF6400]"
                />
                <button
                  onClick={addHeader}
                  disabled={!headerKey.trim() || !headerVal.trim()}
                  className="p-2.5 bg-[#FF6400] hover:bg-white text-black font-bold rounded-xl transition-all disabled:opacity-40 flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>

            {/* List headers */}
            <div className="mt-4 border border-white/5 rounded-xl overflow-hidden bg-black/10">
              <div className="max-h-[192px] overflow-y-auto divide-y divide-white/5">
                {config.customHeaders.map(({ key, value }) => (
                  <div key={key} className="p-2.5 flex items-start justify-between gap-3 text-xs font-mono hover:bg-white/5 group">
                    <div className="flex-1 min-w-0 pr-2">
                       <span className="text-[#FF6400] font-bold block select-none uppercase text-[8px] tracking-widest leading-none mb-1">
                        {key}
                      </span>
                      <span className="text-slate-300 block truncate text-[11px]" title={value}>
                        {value}
                      </span>
                    </div>
                    <button
                      onClick={() => removeHeader(key)}
                      className="text-white/30 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-all rounded cursor-pointer"
                      title="Remove Header"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#131313] p-3 border border-white/5 rounded-xl flex gap-2.5 mt-5">
            <ShieldAlert className="w-4 h-4 text-[#FF6400] shrink-0 mt-0.5" />
            <p className="text-[10px] text-white/40 leading-normal font-sans">
              <strong className="text-[#FF6400] uppercase font-bold">Caution:</strong> Adjusting simulation threads above 30 on standard laptop web sessions might cause heavy local memory garbage-collector spikes. Use reasonable thread pools.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
