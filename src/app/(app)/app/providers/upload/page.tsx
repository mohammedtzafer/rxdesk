"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, ArrowLeft, TrendingUp, Info } from "lucide-react";
import { toast } from "sonner";

interface UploadRecord {
  id: string;
  fileName: string;
  rowCount: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

const EXPECTED_COLUMNS = [
  { name: "Provider Name", desc: "Full name of the prescribing provider" },
  { name: "NPI", desc: "10-digit National Provider Identifier" },
  { name: "Date of Origin", desc: "When the Rx was sent to the pharmacy" },
  { name: "Date of Fill", desc: "When the prescription was filled" },
  { name: "Drug Name", desc: "Name of the drug prescribed" },
  { name: "NDC", desc: "National Drug Code (optional)" },
  { name: "Brand/Generic", desc: "\"Brand\" or \"Generic\"" },
];

export default function ProviderUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{
    rowCount: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/prescriptions/uploads")
      .then((r) => (r.ok ? r.json() : []))
      .then(setHistory)
      .catch(() => {});
  }, [result]);

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Only CSV files are supported");
      return;
    }

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/prescriptions/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ rowCount: data.rowCount, errors: data.errors || [] });
        if (data.rowCount > 0) {
          toast.success(`Uploaded ${data.rowCount} prescription records`);
        } else {
          toast.error("No valid rows found in the file");
        }
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed — check your connection and try again");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <Link
        href="/app/providers"
        className="inline-flex items-center gap-1.5 text-[14px] text-[#0071e3] hover:underline mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Providers
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f] dark:text-white">
            Upload Rx data
          </h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)] dark:text-white/48">
            Import prescription fills to track referral volume by provider
          </p>
        </div>
        <Link
          href="/app/providers/analysis"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#22C55E] text-white rounded-lg text-[14px] hover:bg-[#16A34A] transition-colors shrink-0"
        >
          <TrendingUp className="w-4 h-4" /> Analyze trends
        </Link>
      </div>

      {/* Expected columns reference */}
      <div className="mb-5 bg-[#0071e3]/5 dark:bg-[#0071e3]/10 border border-[#0071e3]/10 dark:border-[#0071e3]/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-[#0071e3] shrink-0" />
          <p className="text-[13px] font-semibold text-[#0071e3]">Expected CSV columns</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {EXPECTED_COLUMNS.map((col) => (
            <div key={col.name} className="flex items-start gap-2">
              <span className="text-[12px] font-mono font-medium text-[#1d1d1f] dark:text-white bg-white dark:bg-white/10 px-1.5 py-0.5 rounded border border-[rgba(0,0,0,0.06)] dark:border-white/10 shrink-0">
                {col.name}
              </span>
              <span className="text-[12px] text-[rgba(0,0,0,0.48)] dark:text-white/48 leading-tight mt-0.5">
                {col.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={[
          "bg-white dark:bg-[#1c1c1e] rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-[#0071e3] bg-[#0071e3]/5"
            : "border-[rgba(0,0,0,0.1)] dark:border-white/20 hover:border-[rgba(0,0,0,0.2)] dark:hover:border-white/30",
        ].join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <Upload
          className={[
            "w-10 h-10 mx-auto transition-colors",
            uploading
              ? "animate-pulse text-[#0071e3]"
              : "text-[rgba(0,0,0,0.20)] dark:text-white/20",
          ].join(" ")}
        />
        <p className="mt-3 text-[17px] text-[#1d1d1f] dark:text-white">
          {uploading ? "Uploading..." : "Drop a CSV file here or click to browse"}
        </p>
        <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.48)] dark:text-white/48">
          .csv files only — max 10 MB
        </p>
      </div>

      {/* Upload result */}
      {result && (
        <div className="mt-4 bg-white dark:bg-[#1c1c1e] rounded-xl p-5 border border-[rgba(0,0,0,0.06)] dark:border-white/10">
          <div className="flex items-center gap-2">
            {result.rowCount > 0 ? (
              <CheckCircle className="w-5 h-5 text-[#22C55E]" />
            ) : (
              <XCircle className="w-5 h-5 text-[#EF4444]" />
            )}
            <p className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">
              {result.rowCount > 0
                ? `${result.rowCount} records imported`
                : "Import failed — no valid rows found"}
            </p>
          </div>
          {result.rowCount > 0 && (
            <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.48)] dark:text-white/48">
              Rx records are now linked to providers. Head to Analyze Trends to see the data.
            </p>
          )}
          {result.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-[14px] text-[rgba(0,0,0,0.48)] dark:text-white/48 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {result.errors.length} row{result.errors.length !== 1 ? "s" : ""} skipped
              </p>
              <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5">
                {result.errors.slice(0, 10).map((err, i) => (
                  <p key={i} className="text-[12px] text-[rgba(0,0,0,0.48)] dark:text-white/48">
                    Row {err.row}: {err.message}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload history */}
      {history.length > 0 && (
        <div className="mt-6">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-3">
            Upload history
          </h2>
          <div className="bg-white dark:bg-[#1c1c1e] rounded-xl border border-[rgba(0,0,0,0.06)] dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.05)] dark:border-white/10">
                    <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[rgba(0,0,0,0.48)] dark:text-white/48 uppercase">
                      File
                    </th>
                    <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[rgba(0,0,0,0.48)] dark:text-white/48 uppercase">
                      Records
                    </th>
                    <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[rgba(0,0,0,0.48)] dark:text-white/48 uppercase hidden md:table-cell">
                      Date range
                    </th>
                    <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[rgba(0,0,0,0.48)] dark:text-white/48 uppercase">
                      Status
                    </th>
                    <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[rgba(0,0,0,0.48)] dark:text-white/48 uppercase hidden md:table-cell">
                      Uploaded
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-[rgba(0,0,0,0.03)] dark:border-white/5 last:border-0"
                    >
                      <td className="px-4 py-2.5 text-[14px] text-[#1d1d1f] dark:text-white">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[rgba(0,0,0,0.30)] dark:text-white/30 shrink-0" />
                          <span className="truncate max-w-[180px]">{u.fileName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[14px] text-[rgba(0,0,0,0.48)] dark:text-white/48">
                        {u.rowCount}
                      </td>
                      <td className="px-4 py-2.5 text-[14px] text-[rgba(0,0,0,0.48)] dark:text-white/48 hidden md:table-cell">
                        {u.dateRangeStart && u.dateRangeEnd
                          ? `${new Date(u.dateRangeStart).toLocaleDateString()} – ${new Date(u.dateRangeEnd).toLocaleDateString()}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={[
                            "inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full",
                            u.status === "COMPLETED"
                              ? "bg-[#22C55E]/10 text-[#22C55E]"
                              : u.status === "FAILED"
                              ? "bg-[#EF4444]/10 text-[#EF4444]"
                              : "bg-[#0071e3]/10 text-[#0071e3]",
                          ].join(" ")}
                        >
                          {u.status === "COMPLETED" && <CheckCircle className="w-3 h-3" />}
                          {u.status === "FAILED" && <XCircle className="w-3 h-3" />}
                          {u.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[14px] text-[rgba(0,0,0,0.48)] dark:text-white/48 hidden md:table-cell">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
