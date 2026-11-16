import React, { useState, useEffect } from 'react';
import { Search, ClipboardList, MessageSquare, Sliders, Award, FileText, UploadCloud } from 'lucide-react';
import { TabType } from '../layout/Sidebar';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: TabType) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({ isOpen, onClose, onSelectTab }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: 'buyer-workspace' as TabType, title: 'Buyer Workspace', desc: 'Inspect clubbed requirements & automated decisions', icon: ClipboardList },
    { id: 'chat-intake' as TabType, title: 'Chat Requisition Intake', desc: 'Conversational PR assistant for plant employees', icon: MessageSquare },
    { id: 'policy-manager' as TabType, title: 'Policy as Data Studio', desc: 'Review active rules & hot-activate amendments', icon: Sliders },
    { id: 'preferred-suppliers' as TabType, title: 'Preferred Suppliers Leaderboard', desc: 'Composite supplier ranking matrix & exports', icon: Award },
    { id: 'contracts' as TabType, title: 'Rate Contracts & Ceilings', desc: 'Monitor consumption & PDF-ingested contracts', icon: FileText },
    { id: 'batch-upload' as TabType, title: 'Batch CSV Runner', desc: 'Execute blind-test PR batch and download outputs', icon: UploadCloud },
  ];

  const filtered = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) || a.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-50 flex items-start justify-center pt-24 p-4">
      <div className="bg-white border border-[#CAD0D8] w-full max-w-xl rounded-[6px] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 py-3 border-b border-[#E1E5EA] gap-3 bg-[#F5F6F8]">
          <Search className="w-4 h-4 text-[#687586]" />
          <input
            type="text"
            placeholder="Search workspaces or type command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-xs text-[#202B38] placeholder-[#8D99A8] focus:outline-none"
          />
          <kbd className="text-[10px] font-mono bg-white border border-[#CAD0D8] px-1.5 py-0.5 rounded text-[#687586]">
            ESC
          </kbd>
        </div>

        <div className="p-2 max-h-80 overflow-y-auto">
          <div className="text-[10px] font-semibold text-[#687586] uppercase tracking-wider px-3 py-1.5">
            Procurement Modules
          </div>
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-[4px] hover:bg-[#F5F6F8] text-left transition-colors group"
              >
                <div className="w-7 h-7 rounded-[4px] bg-[#F5F6F8] border border-[#E1E5EA] flex items-center justify-center text-[#687586] group-hover:text-[#315FCE] group-hover:border-[#C7D7F9]">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#202B38] group-hover:text-[#315FCE]">{item.title}</div>
                  <div className="text-[11px] text-[#687586]">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
