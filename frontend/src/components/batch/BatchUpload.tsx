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
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 gap-4 bg-[#F5F6F8] max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-[#202B38] flex items-center gap-2">
          Batch Ingestion
        </h1>
      </div>

      {/* Upload Zone */}
      <div className="bg-white border border-[#E1E5EA] rounded-[4px] p-5 flex flex-col gap-4 shadow-none">
        <div>
          <h2 className="text-sm font-semibold text-[#202B38] flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#315FCE]" />
            Upload Requisition Batch (CSV)
          </h2>
        </div>

        <div className="border border-dashed border-[#CBD5E1] hover:border-[#315FCE] rounded-[4px] p-6 flex flex-col items-center justify-center gap-2 bg-[#F8FAFC] transition-colors">
          <FileSpreadsheet className="w-8 h-8 text-[#687586]" />
          <div className="text-center">
            <label className="cursor-pointer text-xs font-semibold text-[#315FCE] hover:text-[#254cb2]">
              <span>Choose CSV file</span>
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
            <p className="text-[11px] text-[#687586] mt-0.5">Standard PR batch format</p>
          </div>
          {file && (
            <div className="text-xs font-mono text-[#16845B] font-semibold bg-[#E8F5E9] border border-[#C8E6C9] px-3 py-1 rounded-[4px]">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || isProcessing}
          className="h-9 bg-[#315FCE] hover:bg-[#254cb2] text-white font-medium text-xs rounded-[4px] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <UploadCloud className="w-4 h-4" />
          <span>{isProcessing ? 'Processing Batch...' : 'Process Batch'}</span>
        </button>

        {/* Execution Statistics */}
        {stats && (
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E1E5EA] rounded-[4px] flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#16845B]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#16845B]" />
                <span>Batch Processed Successfully ({stats.elapsed_ms}ms)</span>
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 font-mono text-xs pt-2 border-t border-[#E1E5EA]">
              <div className="bg-white p-2 rounded-[4px] border border-[#E1E5EA]">
                <span className="text-[10px] text-[#687586] block uppercase">Lines Ingested</span>
                <span className="text-[#202B38] font-semibold tabular-nums">{stats.total_pr_lines}</span>
              </div>
              <div className="bg-white p-2 rounded-[4px] border border-[#E1E5EA]">
                <span className="text-[10px] text-[#687586] block uppercase">Requirements</span>
                <span className="text-[#315FCE] font-semibold tabular-nums">{stats.total_requirements}</span>
              </div>
              <div className="bg-white p-2 rounded-[4px] border border-[#E1E5EA]">
                <span className="text-[10px] text-[#687586] block uppercase">Direct POs</span>
                <span className="text-[#16845B] font-semibold tabular-nums">{stats.direct_pos}</span>
              </div>
              <div className="bg-white p-2 rounded-[4px] border border-[#E1E5EA]">
                <span className="text-[10px] text-[#687586] block uppercase">Sourcing Events</span>
                <span className="text-[#C58A25] font-semibold tabular-nums">{stats.sourcing_requests}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submission Exports */}
      <div className="bg-white border border-[#E1E5EA] rounded-[4px] p-5 flex flex-col gap-3 shadow-none">
        <div className="flex items-center justify-between pb-2 border-b border-[#E1E5EA]">
          <h2 className="text-sm font-semibold text-[#202B38] flex items-center gap-2">
            <Download className="w-4 h-4 text-[#315FCE]" />
            <span>Submission Exports</span>
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Run 1 Button */}
          <button
            onClick={() => downloadCSV('aditya_kumar__run1.csv')}
            className="flex flex-col items-start gap-1 p-3 bg-white hover:bg-[#F8FAFC] border border-[#E1E5EA] hover:border-[#315FCE] rounded-[4px] transition-all text-left group"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#202B38] group-hover:text-[#315FCE]">
              <Download className="w-3.5 h-3.5 text-[#315FCE]" />
              <span>Export Run 1</span>
            </div>
            <div className="text-[11px] font-mono text-[#687586]">aditya_kumar__run1.csv</div>
            <div className="text-[10px] text-[#8D99A8] mt-0.5">Policy v5.0</div>
          </button>

          {/* Run 2 Button */}
          <button
            onClick={() => downloadCSV('aditya_kumar__run2.csv')}
            className="flex flex-col items-start gap-1 p-3 bg-white hover:bg-[#F8FAFC] border border-[#E1E5EA] hover:border-[#16845B] rounded-[4px] transition-all text-left group"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#202B38] group-hover:text-[#16845B]">
              <Download className="w-3.5 h-3.5 text-[#16845B]" />
              <span>Export Run 2</span>
            </div>
            <div className="text-[11px] font-mono text-[#687586]">aditya_kumar__run2.csv</div>
            <div className="text-[10px] text-[#8D99A8] mt-0.5">Policy v5.1</div>
          </button>

          {/* Preferred Suppliers Button */}
          <button
            onClick={() => (window.location.href = '/api/suppliers/preferred?format=csv&as_of_date=2026-11-01')}
            className="flex flex-col items-start gap-1 p-3 bg-white hover:bg-[#F8FAFC] border border-[#E1E5EA] hover:border-[#C58A25] rounded-[4px] transition-all text-left group"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#202B38] group-hover:text-[#C58A25]">
              <Download className="w-3.5 h-3.5 text-[#C58A25]" />
              <span>Export Preferred</span>
            </div>
            <div className="text-[11px] font-mono text-[#687586]">aditya_kumar__preferred.csv</div>
            <div className="text-[10px] text-[#8D99A8] mt-0.5">Top 3 Suppliers per Item</div>
          </button>
        </div>

        {/* Status Checklist */}
        <div className="p-3 bg-[#F8FAFC] border border-[#E1E5EA] rounded-[4px] flex items-center justify-between mt-1 text-[11px] font-mono text-[#687586]">
          <div className="flex items-center gap-1.5 text-[#16845B]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>13-Column Schema Verified</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#16845B]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Deterministic Scoring</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#16845B]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Hot Policy Switching</span>
          </div>
        </div>
      </div>
    </div>
  );
};
