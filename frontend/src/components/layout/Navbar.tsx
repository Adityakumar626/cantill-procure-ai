import React from 'react';
import { Zap, Download, FileSpreadsheet } from 'lucide-react';

interface NavbarProps {
  activePolicy: string;
  onExportBatch: () => void;
  onExportPreferred: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePolicy,
  onExportBatch,
  onExportPreferred,
}) => {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-blue-500/20">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-white">Cantill ProcureAI</span>
            <span className="text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
              Enterprise v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Corvo Engineering · Plants PUN1 (Bhosari) & CHK1 (Chakan)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-emerald-400">Policy {activePolicy} Active</span>
        </div>

        <button
          onClick={onExportPreferred}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors"
          title="Export Top 3 Preferred Suppliers CSV"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
          <span>Export Suppliers</span>
        </button>

        <button
          onClick={onExportBatch}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm shadow-blue-600/30 transition-colors"
          title="Export 13-Column Decision CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Decisions (CSV)</span>
        </button>
      </div>
    </header>
  );
};
