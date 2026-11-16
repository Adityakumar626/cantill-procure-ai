import React from 'react';
import {
  ClipboardList,
  MessageSquare,
  Sliders,
  Award,
  FileText,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';

export type TabType =
  | 'buyer-workspace'
  | 'chat-intake'
  | 'policy-manager'
  | 'preferred-suppliers'
  | 'contracts'
  | 'batch-upload';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const menuItems = [
    { id: 'buyer-workspace' as TabType, label: 'Buyer Workspace', icon: ClipboardList },
    { id: 'chat-intake' as TabType, label: 'Chat Intake', icon: MessageSquare },
    { id: 'policy-manager' as TabType, label: 'Policy as Data', icon: Sliders },
    { id: 'preferred-suppliers' as TabType, label: 'Preferred Suppliers', icon: Award },
    { id: 'contracts' as TabType, label: 'Rate Contracts', icon: FileText },
    { id: 'batch-upload' as TabType, label: 'Batch Upload & Run', icon: UploadCloud },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
      <nav className="flex flex-col gap-1.5">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Procurement Modules
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium mb-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Decision Engine Online</span>
        </div>
        <p className="text-[11px] font-mono text-slate-500">Candidate: Aditya Kumar</p>
      </div>
    </aside>
  );
};
