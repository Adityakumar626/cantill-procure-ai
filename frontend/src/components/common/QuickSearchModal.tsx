import React, { useState, useEffect } from 'react';
import { Search, ClipboardList, MessageSquare, Sliders, Award, FileText, UploadCloud, X } from 'lucide-react';
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
    { id: 'chat-intake' as TabType, title: 'Chat Requisition Intake', desc: 'Conversational PR assistant powered by Gemini 2.0', icon: MessageSquare },
    { id: 'policy-manager' as TabType, title: 'Policy as Data Studio', desc: 'Review active policy & hot-activate amendments', icon: Sliders },
    { id: 'preferred-suppliers' as TabType, title: 'Preferred Suppliers Leaderboard', desc: 'Composite supplier ranking matrix & exports', icon: Award },
    { id: 'contracts' as TabType, title: 'Rate Contracts & Ceilings', desc: 'Monitor consumption & PDF-ingested contracts', icon: FileText },
    { id: 'batch-upload' as TabType, title: 'Batch CSV Runner', desc: 'Execute blind-test PR batch and download outputs', icon: UploadCloud },
  ];

  const filtered = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) || a.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-50 flex items-start justify-center pt-24 p-4">
      <div className="bg-[#161f30] border border-white/[0.14] w-full max-w-xl rounded-[10px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] gap-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search workspaces, actions, or type Cmd+K..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono bg-white/[0.06] border border-white/[0.1] px-1.5 py-0.5 rounded text-slate-400">
            ESC
          </kbd>
        </div>

        <div className="p-2 max-h-80 overflow-y-auto">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-1.5">
            Workspaces & Modules
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
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[6px] hover:bg-white/[0.06] text-left transition-colors group"
              >
                <div className="w-7 h-7 rounded-[6px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300 group-hover:text-blue-400 group-hover:border-blue-500/30">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-white group-hover:text-blue-400">{item.title}</div>
                  <div className="text-[11px] text-slate-400">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
