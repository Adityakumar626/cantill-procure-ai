import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { BuyerWorkspace } from './components/workspace/BuyerWorkspace';
import { ChatIntake } from './components/chat/ChatIntake';
import { PolicyManager } from './components/policy/PolicyManager';
import { PreferredSuppliers } from './components/suppliers/PreferredSuppliers';
import { ContractsMonitor } from './components/contracts/ContractsMonitor';
import { BatchUpload } from './components/batch/BatchUpload';
import { Requirement, SummaryKPIs, ProcurementRoute } from './types/procurement';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('buyer-workspace');
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [kpis, setKpis] = useState<SummaryKPIs | null>(null);
  const [activePolicy, setActivePolicy] = useState('v5.0');
  const [isLoading, setIsLoading] = useState(true);

  const fetchBatchDecisions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/process-batch', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to load batch');
      const data = await res.json();
      setRequirements(data.requirements || []);
      setKpis(data.summary || null);
      if (data.summary?.active_policy) {
        setActivePolicy(data.summary.active_policy);
      }
    } catch (err) {
      console.error('Error fetching batch:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchDecisions();
  }, []);

  const handleOverride = async (groupId: string, newRoute: ProcurementRoute, comment: string) => {
    const formData = new FormData();
    formData.append('group_id', groupId);
    formData.append('new_route', newRoute);
    formData.append('comment', comment);
    formData.append('buyer_name', 'Aditya Kumar');

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
            reason: `[BUYER OVERRIDE by Aditya Kumar]: ${comment} (Original: ${r.reason})`,
          };
        }
        return r;
      })
    );
  };

  const handleExportBatch = () => {
    window.location.href = '/api/export/batch?filename=aditya_kumar__run1.csv';
  };

  const handleExportPreferred = () => {
    window.location.href = '/api/suppliers/preferred?format=csv&as_of_date=2026-11-01';
  };

  const handlePolicyActivated = (newVersion: string) => {
    setActivePolicy(newVersion);
    fetchBatchDecisions();
    setActiveTab('buyer-workspace');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <Navbar
        activePolicy={activePolicy}
        onExportBatch={handleExportBatch}
        onExportPreferred={handleExportPreferred}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {activeTab === 'buyer-workspace' && (
            <BuyerWorkspace
              requirements={requirements}
              kpis={kpis}
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
            />
          )}

          {activeTab === 'policy-manager' && (
            <PolicyManager
              activePolicy={activePolicy}
              onPolicyActivated={handlePolicyActivated}
            />
          )}

          {activeTab === 'preferred-suppliers' && <PreferredSuppliers />}

          {activeTab === 'contracts' && <ContractsMonitor />}

          {activeTab === 'batch-upload' && (
            <BatchUpload
              onBatchProcessed={() => {
                fetchBatchDecisions();
                setActiveTab('buyer-workspace');
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};
