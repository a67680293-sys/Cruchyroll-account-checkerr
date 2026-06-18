import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface MetricCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtext?: string;
  colorClass?: string;
  icon?: ReactNode;
}

export function MetricCard({ id, title, value, subtext, colorClass = 'text-white', icon }: MetricCardProps) {
  // Determine left border accent matching the Vibrant Theme design HTML specifications
  let borderAccent = 'border-l-4 border-l-[#FF6400]';
  let titleAccentColor = 'text-[#FF6400]';

  if (title.toLowerCase().includes('hit')) {
    borderAccent = 'border-l-4 border-l-[#FF6400]';
    titleAccentColor = 'text-[#FF6400]';
  } else if (title.toLowerCase().includes('free')) {
    borderAccent = 'border-l-4 border-l-blue-400';
    titleAccentColor = 'text-blue-400';
  } else if (title.toLowerCase().includes('speed') || title.toLowerCase().includes('cpm')) {
    borderAccent = 'border-l-4 border-l-emerald-400';
    titleAccentColor = 'text-emerald-400';
  } else if (title.toLowerCase().includes('elapsed') || title.toLowerCase().includes('time')) {
    borderAccent = 'border-l-4 border-l-rose-500';
    titleAccentColor = 'text-rose-550';
  } else {
    borderAccent = 'border-white/5';
    titleAccentColor = 'text-white/40';
  }

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-[#1A1A1A] ${borderAccent} rounded-2xl p-5 flex flex-col justify-between hover:border-white/10 transition-colors relative overflow-hidden group shadow-2xl border-t border-r border-b border-white/5`}
    >
      <div className="flex justify-between items-start">
        <div>
          <span className={`text-[10px] uppercase font-black tracking-widest ${titleAccentColor}`}>
            {title}
          </span>
          <h3 className={`text-3xl font-black mt-1 tracking-tight ${colorClass}`}>
            {value}
          </h3>
        </div>
        {icon && (
          <div className="p-2 bg-black/40 rounded-lg group-hover:bg-black/60 transition-colors text-white/60">
            {icon}
          </div>
        )}
      </div>
      {subtext && (
        <div className="mt-4 flex items-center space-x-1.5">
          <span className="text-white/40 text-[11px] font-medium leading-none">
            {subtext}
          </span>
        </div>
      )}
      {/* Decorative accent background flare using theme accent */}
      <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-white/5 rounded-full blur-xl group-hover:bg-[#FF6400]/10 transition-all duration-500" />
    </motion.div>
  );
}
