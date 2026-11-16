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
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-7 gap-6 bg-[#F5F6F8] max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#202B38] flex items-center gap-2">
          Batch CSV Ingestion & Blind-Test Runner
        </h1>
        <p className="text-xs text-[#687586] mt-0.5">
          Execute the 8-clause decision engine across bulk PR batches (including Thursday morning's blind test dataset) and generate official submission artifacts.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="bg-white border border-[#E1E5EA] rounded-[8px] p-6 flex flex-col gap-5 shadow-none">
        <div>
          <h2 className="text-sm font-semibold text-[#202B38] flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#315FCE]" />
            Upload Purchase Requisition Batch CSV
          </h2>
          <p className="text-xs text-[#687586] mt-0.5">
            Compatible with <code className="font-mono bg-[#F1F5F9] px-1 py-0.5 rounded text-[#202B38]">sample_pr_batch.csv</code> or the blind-test dataset emailed on Thursday at 10:00 AM IST.
          </p>
        </div>

        <div className="border border-dashed border-[#CBD5E1] hover:border-[#315FCE] rounded-[8px] p-8 flex flex-col items-center justify-center gap-3 bg-[#F8FAFC] transition-colors">
          <FileSpreadsheet className="w-9 h-9 text-[#687586]" />
          <div className="text-center">
            <label className="cursor-pointer text-xs font-semibold text-[#315FCE] hover:text-[#254cb2]">
              <span>Choose PR batch CSV file</span>
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
            <p className="text-[11px] text-[#687586] mt-0.5">Expected 13 standard PR header columns</p>
          </div>
          {file && (
            <div className="text-xs font-mono text-[#16845B] font-semibold bg-[#E8F5E9] border border-[#C8E6C9] px-3 py-1 rounded-[6px]">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || isProcessing}
          className="h-10 bg-[#315FCE] hover:bg-[#254cb2] text-white font-medium text-xs rounded-[6px] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <UploadCloud className="w-4 h-4" />
          <span>{isProcessing ? 'Executing 8-Clause Decision Pipeline...' : 'Process Batch through Engine'}</span>
        </button>

        {/* Execution Statistics */}
        {stats && (
          <div className="p-4 bg-[#F8FAFC] border border-[#E1E5EA] rounded-[8px] flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[#16845B]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#16845B]" />
                <span>Pipeline Execution Succeeded ({stats.elapsed_ms}ms)</span>
              </span>
              <span className="font-mono text-[11px] bg-[#E8F5E9] text-[#16845B] border border-[#C8E6C9] px-2 py-0.5 rounded">
                100% Deterministic
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 font-mono text-xs pt-2 border-t border-[#E1E5EA]">
              <div className="bg-white p-2.5 rounded-[6px] border border-[#E1E5EA]">
                <span className="text-[10px] text-[#687586] block uppercase">Lines Ingested</span>
                <span className="text-[#202B38] font-semibold tabular-nums">{stats.total_pr_lines}</span>
              </div>
              <div className="bg-white p-2.5 rounded-[6px] border border-[#E1E5EA]">
                <span className="text-[10px] text-[#687586] block uppercase">Requirements</span>
                <span className="text-[#315FCE] font-semibold tabular-nums">{stats.total_requirements}</span>
              </div>
              <div className="bg-white p-2.5 rounded-[6px] border border-[#E1E5EA]">
                <span className="text-[10px] text-[#687586] block uppercase">Direct POs</span>
                <span className="text-[#16845B] font-semibold tabular-nums">{stats.direct_pos}</span>
              </div>
              <div className="bg-white p-2.5 rounded-[6px] border border-[#E1E5EA]">
                <span className="text-[10px] text-[#687586] block uppercase">Sourcing Events</span>
                <span className="text-[#C58A25] font-semibold tabular-nums">{stats.sourcing_requests}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Official Submission Exports Hub */}
      <div className="bg-white border border-[#E1E5EA] rounded-[8px] p-6 flex flex-col gap-4 shadow-none">
        <div className="flex items-center justify-between pb-3 border-b border-[#E1E5EA]">
          <div>
            <h2 className="text-sm font-semibold text-[#202B38] flex items-center gap-2">
              <Download className="w-4 h-4 text-[#315FCE]" />
              <span>Official Thursday Blind-Test Submission Exports</span>
            </h2>
            <p className="text-xs text-[#687586] mt-0.5">
              Click to download the exact named submission files required by the Cantill challenge specification.
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#687586] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E1E5EA]">
            Candidate: Aditya Kumar
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Run 1 Button */}
          <button
            onClick={() => downloadCSV('aditya_kumar__run1.csv')}
            className="flex flex-col items-start gap-1 p-3.5 bg-white hover:bg-[#F8FAFC] border border-[#E1E5EA] hover:border-[#315FCE] rounded-[8px] transition-all text-left group"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#202B38] group-hover:text-[#315FCE]">
              <Download className="w-3.5 h-3.5 text-[#315FCE]" />
              <span>Export Run 1 CSV</span>
            </div>
            <div className="text-[11px] font-mono text-[#687586]">aditya_kumar__run1.csv</div>
            <div className="text-[10px] text-[#687586] mt-1">Processed under Baseline Policy v5.0</div>
          </button>

          {/* Run 2 Button */}
          <button
            onClick={() => downloadCSV('aditya_kumar__run2.csv')}
            className="flex flex-col items-start gap-1 p-3.5 bg-white hover:bg-[#F8FAFC] border border-[#E1E5EA] hover:border-[#16845B] rounded-[8px] transition-all text-left group"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#202B38] group-hover:text-[#16845B]">
              <Download className="w-3.5 h-3.5 text-[#16845B]" />
              <span>Export Run 2 CSV</span>
            </div>
            <div className="text-[11px] font-mono text-[#687586]">aditya_kumar__run2.csv</div>
            <div className="text-[10px] text-[#687586] mt-1">Processed under Policy Amendment v5.1</div>
          </button>

          {/* Preferred Suppliers Button */}
          <button
            onClick={() => (window.location.href = '/api/suppliers/preferred?format=csv&as_of_date=2026-11-01')}
            className="flex flex-col items-start gap-1 p-3.5 bg-white hover:bg-[#F8FAFC] border border-[#E1E5EA] hover:border-[#C58A25] rounded-[8px] transition-all text-left group"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#202B38] group-hover:text-[#C58A25]">
              <Download className="w-3.5 h-3.5 text-[#C58A25]" />
              <span>Export Preferred CSV</span>
            </div>
            <div className="text-[11px] font-mono text-[#687586]">aditya_kumar__preferred.csv</div>
            <div className="text-[10px] text-[#687586] mt-1">Top 3 preferred suppliers as of date</div>
          </button>
        </div>

        {/* Pre-submission Checklist */}
        <div className="p-4 bg-[#F8FAFC] border border-[#E1E5EA] rounded-[8px] flex flex-col gap-2 mt-2">
          <div className="text-xs font-semibold text-[#202B38] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#16845B]" />
            <span>Pre-Submission Integrity Checklist (Strict Cantill Rules)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-[#687586] pt-1">
            <div className="flex items-center gap-1.5 text-[#16845B]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Exact 13-Column Schema</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#16845B]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Zero Task Data in Git</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#16845B]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Push before 12:00 noon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
