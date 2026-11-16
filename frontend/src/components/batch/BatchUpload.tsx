import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Download,
  ShieldCheck,
  Clock,
  ArrowRight,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

interface BatchUploadProps {
  onBatchProcessed: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const BatchUpload: React.FC<BatchUploadProps> = ({ onBatchProcessed, onShowToast }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStats(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a CSV file first');
      return;
    }

    setIsProcessing(true);
    setStats(null);

    const formData = new FormData();
    formData.append('file', file);

    const startTime = performance.now();
    try {
      const res = await fetch('/api/process-batch', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to process batch CSV');
      const data = await res.json();
      const elapsed = Math.round(performance.now() - startTime);

      setStats({
        ...data.summary,
        elapsed_ms: elapsed,
      });

      onShowToast(
        'success',
        'Batch Ingested Successfully',
        `Processed ${data.summary.total_pr_lines} PR lines into ${data.summary.total_requirements} requirements in ${elapsed}ms.`
      );
      onBatchProcessed();
    } catch (err: any) {
      onShowToast('error', 'Execution Error', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCSV = (filename: string) => {
    window.location.href = `/api/export/batch?filename=${filename}`;
    onShowToast('info', 'Download Started', `Downloading ${filename}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-7 gap-6 bg-[#090d16] max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
          Batch CSV Ingestion & Blind-Test Runner
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Execute the 8-clause decision engine across bulk PR batches (including Thursday morning's blind test dataset) and generate official submission artifacts.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-[10px] p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-blue-400" />
            Upload Purchase Requisition Batch CSV
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compatible with <code>sample_pr_batch.csv</code> or the blind-test dataset emailed on Thursday at 10:00 AM IST.
          </p>
        </div>

        <div className="border border-dashed border-white/[0.14] hover:border-blue-500/50 rounded-[8px] p-8 flex flex-col items-center justify-center gap-3 bg-[#161f30]/40 transition-colors">
          <FileSpreadsheet className="w-9 h-9 text-slate-500" />
          <div className="text-center">
            <label className="cursor-pointer text-xs font-semibold text-blue-400 hover:text-blue-300">
              <span>Choose PR batch CSV file</span>
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
            <p className="text-[11px] text-slate-500 mt-0.5">Expected 13 standard PR header columns</p>
          </div>
          {file && (
            <div className="text-xs font-mono text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-[6px]">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || isProcessing}
          className="h-10 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-[6px] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
        >
          <UploadCloud className="w-4 h-4" />
          <span>{isProcessing ? 'Executing 8-Clause Decision Pipeline...' : 'Process Batch through Engine'}</span>
        </button>

        {/* Execution Statistics */}
        {stats && (
          <div className="p-4 bg-emerald-500/[0.06] border border-emerald-500/25 rounded-[8px] flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Pipeline Execution Succeeded ({stats.elapsed_ms}ms)</span>
              </span>
              <span className="font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded">
                100% Deterministic
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 font-mono text-xs pt-2 border-t border-emerald-500/20">
              <div className="bg-[#111827] p-2.5 rounded-[6px] border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block uppercase">Lines Ingested</span>
                <span className="text-white font-semibold">{stats.total_pr_lines}</span>
              </div>
              <div className="bg-[#111827] p-2.5 rounded-[6px] border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block uppercase">Requirements</span>
                <span className="text-blue-400 font-semibold">{stats.total_requirements}</span>
              </div>
              <div className="bg-[#111827] p-2.5 rounded-[6px] border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block uppercase">Direct POs</span>
                <span className="text-emerald-400 font-semibold">{stats.direct_pos}</span>
              </div>
              <div className="bg-[#111827] p-2.5 rounded-[6px] border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block uppercase">Sourcing Events</span>
                <span className="text-amber-400 font-semibold">{stats.sourcing_requests}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Official Submission Exports Hub */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-[10px] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-400" />
              <span>Official Thursday Blind-Test Submission Exports</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click to download the exact named submission files required by the Cantill challenge specification.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Candidate: Aditya Kumar</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Run 1 Button */}
          <button
            onClick={() => downloadCSV('aditya_kumar__run1.csv')}
            className="flex flex-col items-start gap-1 p-3.5 bg-[#161f30] hover:bg-white/[0.06] border border-white/[0.08] hover:border-blue-500/40 rounded-[8px] transition-all text-left group"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-blue-400">
              <Download className="w-3.5 h-3.5" />
              <span>Export Run 1 CSV</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">aditya_kumar__run1.csv</div>
            <div className="text-[10px] text-slate-500 mt-1">Processed under Baseline Policy v5.0</div>
          </button>

          {/* Run 2 Button */}
          <button
            onClick={() => downloadCSV('aditya_kumar__run2.csv')}
            className="flex flex-col items-start gap-1 p-3.5 bg-[#161f30] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-500/40 rounded-[8px] transition-all text-left group"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-emerald-400">
              <Download className="w-3.5 h-3.5" />
              <span>Export Run 2 CSV</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">aditya_kumar__run2.csv</div>
            <div className="text-[10px] text-slate-500 mt-1">Processed under Policy Amendment v5.1</div>
          </button>

          {/* Preferred Suppliers Button */}
          <button
            onClick={() => (window.location.href = '/api/suppliers/preferred?format=csv&as_of_date=2026-11-01')}
            className="flex flex-col items-start gap-1 p-3.5 bg-[#161f30] hover:bg-white/[0.06] border border-white/[0.08] hover:border-amber-500/40 rounded-[8px] transition-all text-left group"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-amber-400">
              <Download className="w-3.5 h-3.5" />
              <span>Export Preferred CSV</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">aditya_kumar__preferred.csv</div>
            <div className="text-[10px] text-slate-500 mt-1">Top 3 preferred suppliers as of date</div>
          </button>
        </div>

        {/* Pre-submission Checklist */}
        <div className="p-4 bg-[#090d16] border border-white/[0.06] rounded-[8px] flex flex-col gap-2 mt-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Pre-Submission Integrity Checklist (Strict Cantill Rules)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400 pt-1">
            <div className="flex items-center gap-1.5 text-emerald-400/90">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>Exact 13-Column Schema</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400/90">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>Zero Task Data in Git</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400/90">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>Push before 12:00 noon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
