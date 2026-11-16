import React from 'react';
import {
  ClipboardList,
  MessageSquare,
  Sliders,
  Award,
  FileText,
  UploadCloud,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
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
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
}) => {
  const menuItems = [
    { id: 'buyer-workspace' as TabType, label: 'Buyer Workspace', icon: ClipboardList, badge: '151' },
    { id: 'chat-intake' as TabType, label: 'Chat Intake', icon: MessageSquare, badge: 'AI' },
    { id: 'policy-manager' as TabType, label: 'Policy as Data', icon: Sliders },
    { id: 'preferred-suppliers' as TabType, label: 'Preferred Suppliers', icon: Award },
    { id: 'contracts' as TabType, label: 'Rate Contracts', icon: FileText, badge: '12' },
    { id: 'batch-upload' as TabType, label: 'Batch Studio', icon: UploadCloud },
  ];

  return (
    <aside
      className={`bg-[#090d16] border-r border-white/[0.08] flex flex-col justify-between p-3 shrink-0 transition-all duration-200 ${
        collapsed ? 'w-[68px]' : 'w-[232px]'
      }`}
    >
      <div className="flex flex-col gap-1">
        {/* Module Header & Collapse Toggle */}
        <div className="flex items-center justify-between px-2 mb-2 h-7">
          {!collapsed && (
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Procurement Core
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 ml-auto transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-[6px] text-xs font-medium transition-colors group relative ${
                  isActive
                    ? 'bg-white/[0.08] text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                {!collapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      item.badge === 'AI'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-white/[0.05] text-slate-400 border border-white/[0.08]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Diagnostics Card */}
      <div className="pt-3 border-t border-white/[0.08] text-[11px]">
        {!collapsed ? (
          <div className="bg-[#111827] border border-white/[0.06] p-2.5 rounded-[8px] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Engine Active</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-400">22/22 Tests</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 truncate">
              Corvo Engine · v1.0.0
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Engine Online (22/22 Tests Passing)">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          </div>
        )}
      </div>
    </aside>
  );
};
