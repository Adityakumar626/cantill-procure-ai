import React from 'react';
import { Zap, Download, FileSpreadsheet, Search, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  activePolicy: string;
  onOpenSearch: () => void;
  onExportBatch: () => void;
  onExportPreferred: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePolicy,
  onOpenSearch,
  onExportBatch,
  onExportPreferred,
}) => {
  return (
    <header className="h-16 bg-[#090d16] border-b border-white/[0.08] px-7 flex items-center justify-between sticky top-0 z-50 shrink-0">
      {/* Brand Identity */}
      <div className="flex items-center gap-3.5">
        <div className="w-8 h-8 rounded-[8px] bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <Zap className="w-4 h-4 fill-blue-400/20" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-white">Cantill ProcureAI</span>
            <span className="text-[10px] font-mono font-medium bg-white/[0.05] border border-white/[0.08] text-slate-400 px-1.5 py-0.2 rounded">
              CORVO
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">
            Corvo Engineering · Manufacturing Plants PUN1 (Bhosari) & CHK1 (Chakan)
          </p>
        </div>
      </div>

      {/* Center Policy Pill */}
      <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/[0.08] rounded-full">
        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span className="text-xs font-mono font-medium text-slate-200">
          Policy {activePolicy} Active
        </span>
        <span className="text-[11px] text-slate-500 font-mono">· Eff: 01-Apr-2026</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Quick Search Cmd+K */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 h-9 px-3 text-xs text-slate-400 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-[6px] transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Quick Find...</span>
          <kbd className="text-[10px] font-mono bg-white/[0.06] border border-white/[0.1] px-1.5 py-0.5 rounded text-slate-400 ml-2">
            ⌘K
          </kbd>
        </button>

        {/* Export Suppliers CSV */}
        <button
          onClick={onExportPreferred}
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-300 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-[6px] transition-colors"
          title="Download aditya_kumar__preferred.csv"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
          <span>Export Suppliers</span>
        </button>

        {/* Export Decisions CSV */}
        <button
          onClick={onExportBatch}
          className="flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-[6px] transition-colors"
          title="Download aditya_kumar__run1.csv"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Decisions</span>
        </button>

        {/* Latency Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-emerald-400/90 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>12ms Latency</span>
        </div>
      </div>
    </header>
  );
};
