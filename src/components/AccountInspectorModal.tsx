import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Copy, 
  Cpu, 
  ShieldCheck, 
  Calendar, 
  CreditCard, 
  Users, 
  Globe, 
  Key, 
  Mail, 
  Info,
  CheckCircle2,
  Lock,
  AlertTriangle,
  History
} from 'lucide-react';
import { ComboItem } from '../types';

interface AccountInspectorModalProps {
  combo: ComboItem | null;
  onClose: () => void;
  addLog: (type: 'info' | 'success' | 'warning' | 'error' | 'debug', msg: string) => void;
}

export function AccountInspectorModal({ combo, onClose, addLog }: AccountInspectorModalProps) {
  if (!combo) return null;

  const copyField = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    addLog('success', `Copied account ${label}: ${value}`);
  };

  const getStatusConfig = (status: ComboItem['status']) => {
    switch (status) {
      case 'hit_premium':
        return {
          bg: 'bg-emerald-950/45 border-emerald-500/40 text-emerald-400',
          dot: 'bg-emerald-500',
          label: 'Premium Premium Hit',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        };
      case 'free':
        return {
          bg: 'bg-sky-950/45 border-sky-500/40 text-sky-400',
          dot: 'bg-sky-450',
          label: 'Free Tier (Working Login)',
          icon: <Info className="w-5 h-5 text-sky-400" />
        };
      case '2fa':
        return {
          bg: 'bg-amber-950/45 border-amber-500/40 text-amber-400',
          dot: 'bg-amber-500',
          label: '2FA Verification Required',
          icon: <Lock className="w-5 h-5 text-amber-400" />
        };
      case 'error':
        return {
          bg: 'bg-purple-950/45 border-purple-500/40 text-purple-400',
          dot: 'bg-purple-500',
          label: 'Anti-Bot / Socket Blocked',
          icon: <AlertTriangle className="w-5 h-5 text-purple-400" />
        };
      default:
        return {
          bg: 'bg-rose-950/45 border-rose-500/40 text-rose-450',
          dot: 'bg-rose-500',
          label: 'Bad Account (Invalid)',
          icon: <X className="w-5 h-5 text-rose-500" />
        };
    }
  };

  const statusInfo = getStatusConfig(combo.status);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        {/* Backdrop link click */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 cursor-pointer"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-lg bg-[#141414] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(255,100,0,0.15)] overflow-hidden z-10"
        >
          {/* Header Banner */}
          <div className="p-6 bg-gradient-to-r from-black via-[#1B1B1B] to-black border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center space-x-2.5">
              <Cpu className="w-5 h-5 text-[#FF6400] animate-pulse" />
              <div>
                <h3 className="text-sm font-black font-sans uppercase text-white tracking-widest leading-none">Payload Inspector</h3>
                <span className="text-[10px] font-mono text-white/30 block mt-1 uppercase">ID: {combo.id.slice(-10)}</span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Status Banner */}
            <div className={`p-4 border rounded-2xl flex items-center justify-between ${statusInfo.bg}`}>
              <div className="flex items-center space-x-3">
                {statusInfo.icon}
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-white/50 block leading-none">Outcome Class</span>
                  <span className="text-xs font-black font-sans tracking-wide mt-1 block">{statusInfo.label}</span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 bg-black/45 py-1 px-3 rounded-full border border-white/5">
                <span className={`w-2 h-2 rounded-full ${statusInfo.dot} animate-pulse`} />
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-white">Verified</span>
              </div>
            </div>

            {/* Account Credentials */}
            <div className="bg-[#1C1C1C] rounded-2xl border border-white/5 p-4.5 space-y-3 shadow-inner">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-wider block">Credential Information</span>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-black/35 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                  <div className="flex items-center space-x-2.5 shrink-0">
                    <Mail className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-xs text-white/40 font-bold">Email:</span>
                  </div>
                  <div className="flex items-center space-x-1 min-w-0 pr-1 pl-4">
                    <span className="text-xs font-mono text-slate-200 select-all truncate" title={combo.email}>{combo.email}</span>
                    <button 
                      onClick={() => copyField('Email', combo.email)}
                      className="p-1 text-white/20 hover:text-[#FF6400] transition-colors rounded hover:bg-white/5 shrink-0"
                      title="Copy email"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-black/35 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                  <div className="flex items-center space-x-2.5 shrink-0">
                    <Key className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-xs text-white/40 font-bold">Password:</span>
                  </div>
                  <div className="flex items-center space-x-1 min-w-0 pr-1 pl-4">
                    <span className="text-xs font-mono text-slate-200 select-all truncate" title={combo.pass}>{combo.pass}</span>
                    <button 
                      onClick={() => copyField('Password', combo.pass)}
                      className="p-1 text-white/20 hover:text-[#FF6400] transition-colors rounded hover:bg-white/5 shrink-0"
                      title="Copy password"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Captures Details metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1C1C1C] border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-inner">
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FF6400]" />
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">SECURE SUBSCRIPTION</span>
                </div>
                <h4 className="text-sm font-black font-sans text-white mt-2">
                  {combo.tier !== 'N/A' ? combo.tier : 'N/A (No Login)'}
                </h4>
                <p className="text-[10px] text-white/30 font-sans mt-1">Confirmed Account Tier</p>
              </div>

              <div className="bg-[#1C1C1C] border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-inner">
                <div className="flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#FF6400]" />
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">REGION CODE</span>
                </div>
                <h4 className="text-sm font-black font-sans text-white mt-2">
                  {combo.country && combo.country !== 'N/A' ? `CR_${combo.country}` : 'N/A'}
                </h4>
                <p className="text-[10px] text-white/30 font-sans mt-1">Geolocated Ingress Region</p>
              </div>

              <div className="bg-[#1C1C1C] border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-inner">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#FF6400]" />
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">NEXT BILLING CYCLE</span>
                </div>
                <h4 className="text-sm font-black font-sans text-white mt-2">
                  {combo.nextBilling && combo.nextBilling !== 'N/A' ? combo.nextBilling : 'N/A'}
                </h4>
                <p className="text-[10px] text-white/30 font-sans mt-1">Payment renew date value</p>
              </div>

              <div className="bg-[#1C1C1C] border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-inner">
                <div className="flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-[#FF6400]" />
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">AVATAR SLOTS</span>
                </div>
                <h4 className="text-sm font-black font-sans text-white mt-2">
                  {combo.profiles > 0 ? `${combo.profiles} User Profiles` : '0 Slots'}
                </h4>
                <p className="text-[10px] text-white/30 font-sans mt-1">Simultaneous stream limits</p>
              </div>
            </div>

            {/* Additional parameters */}
            <div className="bg-[#1C1C1C] rounded-2xl border border-white/5 p-4.5 space-y-3.5 shadow-inner">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-wider block">Reverse Diagnostic Details</span>
              
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-white/40 text-[11px] font-sans">Payment Method Injected:</span>
                  <span className="text-slate-200 font-bold flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-[#FF6400]" /> {combo.paymentMethod || 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-white/40 text-[11px] font-sans">Verification Engine:</span>
                  <span className="text-orange-400 font-black text-[10px] uppercase bg-orange-950/20 py-0.5 px-2.5 border border-orange-900/35 rounded-full">
                    Mobile APK Client 3.34
                  </span>
                </div>

                {combo.checkedByProxy && (
                  <div className="flex justify-between items-start py-1">
                    <span className="text-white/40 text-[11px] font-sans shrink-0">Bypassed Via Proxy:</span>
                    <span className="text-slate-300 break-all text-right text-[10px]" title={combo.checkedByProxy}>
                      {combo.checkedByProxy}
                    </span>
                  </div>
                )}

                {combo.errorMessage && (
                  <div className="flex justify-between items-start py-1">
                    <span className="text-white/40 text-[11px] font-sans shrink-0">Exception Trace:</span>
                    <span className="text-rose-450 font-sans font-bold text-right text-[11px]">
                      {combo.errorMessage}
                    </span>
                  </div>
                )}

                {combo.checkedAt && (
                  <div className="flex justify-between items-center py-1 border-t border-white/5 pt-2">
                    <span className="text-white/40 text-[11px] font-sans flex items-center gap-1">
                      <History className="w-3.5 h-3.5" /> Checked timestamp:
                    </span>
                    <span className="text-white/60 text-[10px]">
                      {combo.checkedAt}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="p-5 bg-black border-t border-white/5 flex gap-3">
            <button
              onClick={() => {
                const text = `${combo.email}:${combo.pass}`;
                navigator.clipboard.writeText(text);
                addLog('success', `Copied login credential: ${text}`);
              }}
              className="flex-1 py-3 px-4 bg-[#FF6400] text-black text-xs font-black rounded-xl hover:bg-white transition-all uppercase cursor-pointer"
            >
              Copy Full Pair (email:pass)
            </button>
            <button
              onClick={onClose}
              className="py-3 px-5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Dismiss Inspect
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
