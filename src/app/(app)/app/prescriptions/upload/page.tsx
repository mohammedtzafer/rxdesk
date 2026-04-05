"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
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

export default function UploadPage() {
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
          toast.success(`Uploaded ${data.rowCount} prescriptions`);
        } else {
          toast.error("No valid rows found");
        }
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
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
    <div>
      <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-foreground">
        Upload prescriptions
      </h1>
      <p className="mt-1 text-[17px] text-muted-foreground">
        Import prescription data from a CSV file.
      </p>

      {/* Drop zone */}
      <div
        className={`mt-6 bg-card rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
          dragOver ? "border-[#0071e3] bg-[#0071e3]/5" : "border-border"
        }`}
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
          className={`w-10 h-10 mx-auto ${
            uploading ? "animate-pulse text-[#0071e3]" : "text-muted-foreground/40"
          }`}
        />
        <p className="mt-3 text-[17px] text-foreground">
          {uploading ? "Uploading..." : "Drop a CSV file here or click to browse"}
        </p>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Expected columns: NPI, drug name, fill date, quantity, days supply, payer type, generic
          flag
        </p>
      </div>

      {/* Upload result */}
      {result && (
        <div className="mt-4 bg-card rounded-xl p-5">
          <div className="flex items-center gap-2">
            {result.rowCount > 0 ? (
              <CheckCircle className="w-5 h-5 text-[#22C55E]" />
            ) : (
              <XCircle className="w-5 h-5 text-[#EF4444]" />
            )}
            <p className="text-[17px] font-semibold text-foreground">
              {result.rowCount > 0 ? `${result.rowCount} rows imported` : "Import failed"}
            </p>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-[14px] text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {result.errors.length} row
                {result.errors.length !== 1 ? "s" : ""} skipped
              </p>
              <div className="mt-2 max-h-40 overflow-y-auto">
                {result.errors.slice(0, 10).map((err, i) => (
                  <p key={i} className="text-[12px] text-muted-foreground">
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
          <h2 className="text-[17px] font-semibold text-foreground">Upload history</h2>
          <div className="mt-3 bg-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto"><table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-muted-foreground uppercase">
                    File
                  </th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-muted-foreground uppercase">
                    Rows
                  </th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-muted-foreground uppercase hidden md:table-cell">
                    Date range
                  </th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-muted-foreground uppercase hidden md:table-cell">
                    Uploaded
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((u) => (
                  <tr key={u.id} className="border-b border-border/50">
                    <td className="px-4 py-2.5 text-[14px] text-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                        <span className="truncate max-w-[180px]">{u.fileName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[14px] text-muted-foreground">
                      {u.rowCount}
                    </td>
                    <td className="px-4 py-2.5 text-[14px] text-muted-foreground hidden md:table-cell">
                      {u.dateRangeStart && u.dateRangeEnd
                        ? `${new Date(u.dateRangeStart).toLocaleDateString()} – ${new Date(u.dateRangeEnd).toLocaleDateString()}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full ${
                          u.status === "COMPLETED"
                            ? "bg-[#22C55E]/10 text-[#22C55E]"
                            : u.status === "FAILED"
                              ? "bg-[#EF4444]/10 text-[#EF4444]"
                              : "bg-[#0071e3]/10 text-[#0071e3]"
                        }`}
                      >
                        {u.status === "COMPLETED" && <CheckCircle className="w-3 h-3" />}
                        {u.status === "FAILED" && <XCircle className="w-3 h-3" />}
                        {u.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[14px] text-muted-foreground hidden md:table-cell">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>
      )}
    </div>
  );
}
