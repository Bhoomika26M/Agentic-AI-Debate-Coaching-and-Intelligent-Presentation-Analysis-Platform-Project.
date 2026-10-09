'use client';

import React, { useState } from 'react';
import { Download, FileText, Check, X, FileSpreadsheet } from 'lucide-react';

interface Props {
  title: string;
  content: string;
  onClose: () => void;
}

export default function ReportExporter({ title, content, onClose }: Props) {
  const [downloaded, setDownloaded] = useState<string | null>(null);

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #0f172a; line-height: 1.6; }
              h1 { font-size: 24px; color: #1e1b4b; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
              pre { background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 13px; border: 1px solid #e2e8f0; }
              .badge { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; }
            </style>
          </head>
          <body>
            <span class="badge">VerbalArena AI Official Report</span>
            <h1>${title}</h1>
            <p><strong>Generated At:</strong> ${new Date().toLocaleString()}</p>
            <pre>${content}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
    setDownloaded('PDF');
    setTimeout(() => setDownloaded(null), 3000);
  };

  const handleExportCSV = () => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded('CSV');
    setTimeout(() => setDownloaded(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Export Analytics Report</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-400">Select export format for official documentation and archiving:</p>

          <button
            onClick={handleExportPDF}
            className="w-full flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">Formatted PDF Document</h4>
                <p className="text-[10px] text-slate-400">Includes score badges & full criteria breakdown</p>
              </div>
            </div>
            {downloaded === 'PDF' && <Check className="h-4 w-4 text-emerald-400" />}
          </button>

          <button
            onClick={handleExportCSV}
            className="w-full flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4 hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">CSV Data Spreadsheet</h4>
                <p className="text-[10px] text-slate-400">Raw metrics format for Excel / Google Sheets</p>
              </div>
            </div>
            {downloaded === 'CSV' && <Check className="h-4 w-4 text-emerald-400" />}
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
