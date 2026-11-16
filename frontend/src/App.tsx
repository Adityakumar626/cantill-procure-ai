import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { BuyerWorkspace } from './components/workspace/BuyerWorkspace';
import { ChatIntake } from './components/chat/ChatIntake';
import { PolicyManager } from './components/policy/PolicyManager';
import { PreferredSuppliers } from './components/suppliers/PreferredSuppliers';
import { ContractsMonitor } from './components/contracts/ContractsMonitor';
import { BatchUpload } from './components/batch/BatchUpload';
import { ToastContainer } from './components/common/Toast';
import { QuickSearchModal } from './components/common/QuickSearchModal';
import { Requirement, SummaryKPIs, ProcurementRoute, ToastMessage } from './types/procurement';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('buyer-workspace');
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [kpis, setKpis] = useState<SummaryKPIs | null>(null);
  const [activePolicy, setActivePolicy] = useState('v5.0');
  const [isLoading, setIsLoading] = useState(true);

  // Shell State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchBatchDecisions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/process-batch', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to load batch decisions');
      const data = await res.json();
      setRequirements(data.requirements || []);
      setKpis(data.summary || null);
      if (data.summary?.active_policy) {
        setActivePolicy(data.summary.active_policy);
      }
    } catch (err: any) {
      addToast('error', 'Data Ingestion Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchDecisions();

    // Global Cmd+K keyboard shortcut
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleOverride = async (
    groupId: string,
    newRoute: ProcurementRoute,
    comment: string,
    buyerSignature: string
  ) => {
    const formData = new FormData();
    formData.append('group_id', groupId);
    formData.append('new_route', newRoute);
    formData.append('comment', comment);
    formData.append('buyer_name', buyerSignature);

    const res = await fetch('/api/override', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to record override');

    setRequirements((prev) =>
      prev.map((r) => {
        if (r.group_id === groupId) {
          return {
            ...r,
            route: newRoute,
            decision: newRoute.includes('PO') ? 'PO' : 'SOURCING_REQUEST',
            reason: `[BUYER OVERRIDE by ${buyerSignature}]: ${comment} (Prior: ${r.reason})`,
          };
        }
        return r;
      })
    );

    addToast(
      'success',
      'Override Authorized',
      `Requirement ${groupId} overridden to ${newRoute} with audit justification logged.`
    );
  };

  const handleExportBatch = () => {
    window.location.href = '/api/export/batch?filename=aditya_kumar__run1.csv';
    addToast('info', 'Export Started', 'Downloading aditya_kumar__run1.csv');
  };

  const handleExportPreferred = () => {
    window.location.href = '/api/suppliers/preferred?format=csv&as_of_date=2026-11-01';
    addToast('info', 'Export Started', 'Downloading aditya_kumar__preferred.csv');
  };

  const handlePolicyActivated = (newVersion: string) => {
    setActivePolicy(newVersion);
    fetchBatchDecisions();
    setActiveTab('buyer-workspace');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100 select-none">
      {/* Top Navigation */}
      <Navbar
        activePolicy={activePolicy}
        onOpenSearch={() => setIsSearchOpen(true)}
        onExportBatch={handleExportBatch}
        onExportPreferred={handleExportPreferred}
      />

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-[#090d16]">
          {activeTab === 'buyer-workspace' && (
            <BuyerWorkspace
              requirements={requirements}
              kpis={kpis}
              isLoading={isLoading}
              onReloadSample={fetchBatchDecisions}
              onOverride={handleOverride}
            />
          )}

          {activeTab === 'chat-intake' && (
            <ChatIntake
              onPRConfirmed={() => {
                fetchBatchDecisions();
                setActiveTab('buyer-workspace');
              }}
              onShowToast={addToast}
            />
          )}

          {activeTab === 'policy-manager' && (
            <PolicyManager
              activePolicy={activePolicy}
              onPolicyActivated={handlePolicyActivated}
              onShowToast={addToast}
            />
          )}

          {activeTab === 'preferred-suppliers' && (
            <PreferredSuppliers onShowToast={addToast} />
          )}

          {activeTab === 'contracts' && (
            <ContractsMonitor onShowToast={addToast} />
          )}

          {activeTab === 'batch-upload' && (
            <BatchUpload
              onBatchProcessed={() => {
                fetchBatchDecisions();
                setActiveTab('buyer-workspace');
              }}
              onShowToast={addToast}
            />
          )}
        </main>
      </div>

      {/* Global Quick Search (Cmd+K) Modal */}
      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTab={setActiveTab}
      />

      {/* Toast Notification Stack */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
