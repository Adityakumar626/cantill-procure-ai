import React from 'react';
import { Download, FileSpreadsheet, Search } from 'lucide-react';

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
    <header className="h-16 bg-white border-b border-[#E1E5EA] px-6 flex items-center justify-between sticky top-0 z-50 shrink-0">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-[4px] bg-[#172536] flex items-center justify-center text-white font-bold text-sm tracking-wider font-mono">
          CP
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-[#202B38]">Cantill ProcureAI</span>
            <span className="text-[10px] font-mono font-medium bg-[#F5F6F8] border border-[#E1E5EA] text-[#687586] px-1.5 py-0.2 rounded-[3px]">
              CORVO
            </span>
          </div>
          <p className="text-[11px] text-[#687586] font-normal">
            Corvo Engineering
          </p>
        </div>
      </div>

      {/* Center Policy Pill */}
      <div className="flex items-center gap-2 px-3 py-1 bg-[#F5F6F8] border border-[#E1E5EA] rounded-[4px]">
        <span className="w-2 h-2 rounded-full bg-[#16845B]"></span>
        <span className="text-xs font-mono font-semibold text-[#202B38]">
          Policy {activePolicy} Active
        </span>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-2.5">
        {/* Quick Search Cmd+K */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 h-9 px-3 text-xs text-[#687586] bg-[#F5F6F8] hover:bg-[#E1E5EA] border border-[#E1E5EA] rounded-[4px] transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-[#687586]" />
          <span>Find in workspace...</span>
          <kbd className="text-[10px] font-mono bg-white border border-[#CAD0D8] px-1.5 py-0.2 rounded text-[#687586] ml-2">
            ⌘K
          </kbd>
        </button>

        {/* Export Suppliers CSV */}
        <button
          onClick={onExportPreferred}
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#202B38] bg-white hover:bg-[#F5F6F8] border border-[#CAD0D8] rounded-[4px] transition-colors"
          title="Export Preferred Suppliers"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-[#C58A25]" />
          <span>Export Suppliers</span>
        </button>

        {/* Export Decisions CSV */}
        <button
          onClick={onExportBatch}
          className="flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#315FCE] hover:bg-[#254DB0] rounded-[4px] transition-colors shadow-sm"
          title="Export Decisions CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Decisions CSV</span>
        </button>
      </div>
    </header>
  );
};
