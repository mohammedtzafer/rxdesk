"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("No verification token provided.");
      return;
    }

    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
        } else {
          const data = await res.json();
          setStatus("error");
          setError(data.error || "Verification failed");
        }
      })
      .catch(() => {
        setStatus("error");
        setError("Something went wrong");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 mx-auto text-[#0071e3] animate-spin" />
            <h1 className="mt-4 text-[28px] font-normal leading-[1.14] tracking-[0.196px] text-[#1d1d1f]">
              Verifying your email...
            </h1>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-[#22C55E] flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="mt-4 text-[28px] font-normal leading-[1.14] tracking-[0.196px] text-[#1d1d1f]">
              Email verified
            </h1>
            <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)]">
              Your account is ready. Sign in to get started.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="mt-6 px-6 py-2.5 bg-[#0071e3] text-white rounded-lg text-[17px] hover:bg-[#0077ED] transition-colors"
            >
              Sign in
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-[#EF4444] flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="mt-4 text-[28px] font-normal leading-[1.14] tracking-[0.196px] text-[#1d1d1f]">
              Verification failed
            </h1>
            <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)]">{error}</p>
            <button
              onClick={() => router.push("/signup")}
              className="mt-6 px-6 py-2.5 bg-[#0071e3] text-white rounded-lg text-[17px] hover:bg-[#0077ED] transition-colors"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
