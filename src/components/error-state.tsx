import { AlertTriangle, RefreshCw } from "lucide-react";

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="bg-white rounded-xl p-8 text-center">
      <AlertTriangle className="w-10 h-10 mx-auto text-[#EF4444]/60" />
      <h3 className="mt-3 text-[17px] font-semibold text-[#1d1d1f]">Something went wrong</h3>
      <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.48)]">{message || "Failed to load data. Please try again."}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED]">
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      )}
    </div>
  );
}
