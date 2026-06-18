import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Database, 
  UploadCloud, 
  Trash2, 
  FileText, 
  Play, 
  Sparkles, 
  Shuffle, 
  Dna,
  MailCheck,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { ComboItem } from '../types';
import { parseCombos, getDomainDistribution } from '../utils/comboParser';

interface ComboManagerProps {
  combos: ComboItem[];
  setCombos: React.Dispatch<React.SetStateAction<ComboItem[]>>;
  addLog: (type: 'info' | 'success' | 'warning' | 'error' | 'debug', msg: string) => void;
}

export function ComboManager({ combos, setCombos, addLog }: ComboManagerProps) {
  const [rawInput, setRawInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    if (!rawInput.trim()) return;
    const parsed = parseCombos(rawInput);
    if (parsed.length === 0) {
      addLog('warning', 'No valid combo combinations parsed. Verify required email:password structures.');
      return;
    }

    const newCombos: ComboItem[] = parsed.map((item, idx) => ({
      ...item,
      id: `combo_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
    }));

    setCombos(prev => {
      const existingKeys = new Set(prev.map(c => `${c.email.toLowerCase()}:${c.pass}`));
      const uniqueNew = newCombos.filter(c => !existingKeys.has(`${c.email.toLowerCase()}:${c.pass}`));
      addLog('success', `Populated ${uniqueNew.length} unique active credentials to target queue (${newCombos.length - uniqueNew.length} duplicates filtered).`);
      return [...prev, ...uniqueNew];
    });

    setRawInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseCombos(text);
        if (parsed.length > 0) {
          const newCombos: ComboItem[] = parsed.map((item, idx) => ({
            ...item,
            id: `combo_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
          }));
          setCombos(prev => {
            const existingKeys = new Set(prev.map(c => `${c.email.toLowerCase()}:${c.pass}`));
            const uniqueNew = newCombos.filter(c => !existingKeys.has(`${c.email.toLowerCase()}:${c.pass}`));
            addLog('success', `Imported ${uniqueNew.length} combos from file "${file.name}".`);
            return [...prev, ...uniqueNew];
          });
        } else {
          addLog('error', `Could not find any standard mail:password patterns in file: ${file.name}`);
        }
      }
    };
    reader.readAsText(file);
  };

  // Drag over
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
        const parsed = parseCombos(text);
        if (parsed.length > 0) {
          const newCombos: ComboItem[] = parsed.map((item, idx) => ({
            ...item,
            id: `combo_${Date.now()}_${idx}`,
          }));
          setCombos(prev => {
            const existingKeys = new Set(prev.map(c => `${c.email.toLowerCase()}:${c.pass}`));
            const uniqueNew = newCombos.filter(c => !existingKeys.has(`${c.email.toLowerCase()}:${c.pass}`));
            addLog('success', `Dropped and parsed ${uniqueNew.length} combos from file "${file.name}"`);
            return [...prev, ...uniqueNew];
          });
        }
      }
    };
    reader.readAsText(file);
  };

  // Shuffle / randomize list order
  const shuffleCombos = () => {
    if (combos.length === 0) return;
    setCombos(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      addLog('info', 'Credential sequence shuffled to optimize proxy query distribution.');
      return shuffled;
    });
  };

  const clearAll = () => {
    setCombos([]);
    addLog('info', 'Credentials queue flushed.');
  };

  // Domain breakdown Calculations
  const domains = getDomainDistribution(combos);
  const sortedDomains = Object.entries(domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="combo-manager-section">
      {/* Upload Column Left */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center space-x-2 pb-4 border-b border-white/5">
            <Database className="w-5 h-5 text-[#FF6400]" />
            <h2 className="text-lg font-black tracking-tight text-white font-sans uppercase">Combo Queue Importer</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-[11px] text-white/50 uppercase font-bold mb-1.5 block tracking-wide">
                Paste Combos (email:pass format)
              </label>
              <textarea
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                placeholder="user@gmail.com:mypassword123&#10;animefan@yahoo.com:crunchypassword"
                className="w-full h-44 bg-black/40 text-slate-200 font-mono text-xs border border-white/5 p-3 rounded-xl focus:outline-none focus:border-[#FF6400] transition-colors placeholder:text-white/20 resize-none"
              />
            </div>

            {/* Drag & Drop */}
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
                Drag & Drop combo file (.txt)
              </span>
              <span className="text-[10px] text-white/40 font-mono mt-1">
                or click to browse local folders
              </span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt"
                className="hidden"
              />
            </div>

            {/* Actions panel */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleImport}
                disabled={!rawInput.trim()}
                className="flex-1 bg-[#FF6400] hover:bg-white text-black font-sans text-xs font-black py-2.5 px-4 rounded-full shadow-lg hover:shadow-[0_0_15px_rgba(255,100,0,0.25)] transition-all duration-200 uppercase disabled:opacity-45"
              >
                Parse Credentials
              </button>
              <button
                onClick={clearAll}
                disabled={combos.length === 0}
                className="p-2.5 bg-[#2A2A2A] hover:bg-[#333] border border-white/5 rounded-full text-rose-400 hover:text-rose-300 disabled:opacity-40 transition-all duration-200"
                title="Flush List"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tool bar */}
        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center space-x-2 pb-3 border-b border-white/5">
            <Sparkles className="w-4.5 h-4.5 text-[#FF6400]" />
            <h3 className="text-xs uppercase font-black text-white/50 tracking-wider">Queue Utilities</h3>
          </div>
          <p className="text-white/40 text-xs mt-2.5 font-sans leading-relaxed">
            Manipulate the loaded proxy and credential order to optimize the sequence payload.
          </p>

          <div className="mt-4 flex gap-3">
            <button
              onClick={shuffleCombos}
              disabled={combos.length === 0}
              className="py-2 px-6 bg-[#2A2A2A] border border-white/5 hover:border-white/10 hover:bg-[#333] rounded-full text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5 disabled:opacity-40"
              title="Shuffle queue"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle Combos Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics breakdown Column Right */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5 shadow-2xl flex flex-col min-h-[350px]">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <h3 className="text-sm font-black font-sans text-white flex items-center gap-1.5 uppercase">
              <MailCheck className="w-4 h-4 text-emerald-400" />
              Parsed Queue Metrics
            </h3>
            <span className="font-mono text-[10px] bg-[#FF6400]/10 px-3 py-1 rounded-full border border-[#FF6400]/20 text-[#FF6400] font-bold shadow-inner uppercase tracking-wider">
              {combos.length} Accounts Loaded
            </span>
          </div>

          {combos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-12 h-12 text-white/10 stroke-1 mb-3" />
              <p className="text-white/40 text-xs max-w-sm font-sans leading-relaxed">
                Importer queue currently empty. Paste combinations or load a formatted text file (.txt) to evaluate account records.
              </p>
            </div>
          ) : (
            <div className="mt-4 flex-1 flex flex-col justify-between space-y-6">
              {/* Domain Analytics */}
              <div>
                <span className="text-[11px] font-bold text-white/50 block mb-3 uppercase tracking-wide">
                  Top Mail Server Domains
                </span>
                <div className="space-y-2.5">
                  {sortedDomains.map(([domain, count]) => {
                     const percentage = Math.round((count / combos.length) * 100);
                     return (
                       <div key={domain} className="space-y-1">
                         <div className="flex justify-between text-xs font-mono">
                           <span className="text-white/70 font-medium">{domain}</span>
                           <span className="text-white/40 font-semibold">{count} ({percentage}%)</span>
                         </div>
                         <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
                           <div 
                             className="bg-[#FF6400] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(255,100,0,0.6)]" 
                             style={{ width: `${percentage}%` }}
                           />
                         </div>
                       </div>
                     );
                  })}
                </div>
              </div>

              {/* Status verification cards helper */}
              <div className="bg-black/40 p-4 border border-white/5 rounded-2xl space-y-2 shadow-inner">
                <div className="flex gap-2 text-xs text-white/70 font-medium">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="font-sans leading-relaxed">
                    Parser validated successfully. File duplicates have been cleaned and email characters have been parsed into standard indexing nodes.
                  </p>
                </div>
                <div className="flex gap-2 text-xs text-white/40 font-medium pt-2 border-t border-white/5">
                  <HelpCircle className="w-3.5 h-3.5 text-white/30 mt-0.5 shrink-0" />
                  <p className="font-sans leading-relaxed">
                    Trigger syntax parsed: Using words such as <code className="text-[#FF6400] font-mono text-[11px] font-extrabold bg-[#FF6400]/10 px-1 rounded">premium</code>, <code className="text-[#FF6400] font-mono text-[11px] font-extrabold bg-[#FF6400]/10 px-1 rounded">free</code>, or <code className="text-[#FF6400] font-mono text-[11px] font-extrabold bg-[#FF6400]/10 px-1 rounded">2fa</code> will force test outcomes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
