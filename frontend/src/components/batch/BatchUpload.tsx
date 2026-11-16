import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, Download, ArrowRight } from 'lucide-react';

interface BatchUploadProps {
  onBatchProcessed: () => void;
}

export const BatchUpload: React.FC<BatchUploadProps> = ({ onBatchProcessed }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResultMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a CSV file first');
      return;
    }

    setIsProcessing(true);
    setResultMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/process-batch', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to process batch CSV');
      const data = await res.json();

      setResultMessage(
        `Successfully processed ${data.summary.total_pr_lines} PR lines into ${data.summary.total_requirements} clubbed requirements! Ready for export.`
      );
      onBatchProcessed();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCSV = (filename: string) => {
    window.location.href = `/api/export/batch?filename=${filename}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 gap-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          Batch CSV Ingestion & Blind-Test Runner
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Upload any Purchase Requisition batch CSV (including Thursday morning's blind test dataset) to execute the 8-clause decision engine.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-5 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-blue-400" />
            Upload PR Batch CSV File
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Expected columns: <code>pr_no, pr_line, created_at, requester, department, plant, item_code, description, quantity, uom, estimated_unit_price, need_by_date, urgency</code>
          </p>
        </div>

        <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-850/50 transition-colors">
          <FileSpreadsheet className="w-10 h-10 text-slate-500" />
          <div className="text-center">
            <label className="cursor-pointer text-xs font-semibold text-blue-400 hover:text-blue-300">
              <span>Choose a CSV file</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-slate-500 mt-1">or drag and drop your file here</p>
          </div>
          {file && (
            <div className="text-xs font-mono text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleUpload}
            disabled={!file || isProcessing}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{isProcessing ? 'Processing 8 Clauses...' : 'Process Batch through Engine'}</span>
          </button>
        </div>

        {resultMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{resultMessage}</span>
            </div>

            <div className="pt-2 border-t border-emerald-500/20 flex items-center gap-3">
              <button
                onClick={() => downloadCSV('aditya_kumar__run1.csv')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download as aditya_kumar__run1.csv</span>
              </button>

              <button
                onClick={() => downloadCSV('aditya_kumar__run2.csv')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download as aditya_kumar__run2.csv</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
