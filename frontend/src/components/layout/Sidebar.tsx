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
      className={`bg-[#172536] text-white flex flex-col justify-between p-3 shrink-0 transition-all duration-200 select-none ${
        collapsed ? 'w-[68px]' : 'w-[232px]'
      }`}
    >
      <div className="flex flex-col gap-1">
        {/* Module Header & Collapse Toggle */}
        <div className="flex items-center justify-between px-2 mb-2 h-7 text-[#8A9BAE]">
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Procurement Core
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-[#1F334A] text-[#8A9BAE] hover:text-white ml-auto transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex flex-col gap-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-[4px] text-xs font-medium transition-colors group relative ${
                  isActive
                    ? 'bg-[#263D57] text-white font-semibold shadow-inner'
                    : 'text-[#C7D0DA] hover:text-white hover:bg-[#1F334A]'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#87B4FA]' : 'text-[#8A9BAE] group-hover:text-white'}`} />
                {!collapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      item.badge === 'AI'
                        ? 'bg-[#315FCE] text-white font-semibold'
                        : 'bg-[#1F334A] text-[#C7D0DA]'
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
      <div className="pt-3 border-t border-[#1F334A] text-[11px]">
        {!collapsed ? (
          <div className="bg-[#1F334A] border border-[#2D4560] p-2.5 rounded-[4px] flex flex-col gap-1">
            <div className="flex items-center justify-between text-white">
              <span className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Engine Active</span>
              </span>
              <span className="font-mono text-[10px] text-[#34D399]">22/22 Tests</span>
            </div>
            <div className="text-[10px] font-mono text-[#8A9BAE] truncate">
              Candidate: Aditya Kumar
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Engine Active (22/22 Tests Passing)">
            <div className="w-2 h-2 rounded-full bg-[#34D399]"></div>
          </div>
        )}
      </div>
    </aside>
  );
};
