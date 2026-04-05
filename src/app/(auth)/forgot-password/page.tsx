"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || "Request failed");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-[#0071e3]/10 flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-[#0071e3]" />
          </div>
          <h1 className="mt-4 text-[28px] font-normal leading-[1.14] tracking-[0.196px] text-foreground">
            Check your email
          </h1>
          <p className="mt-2 text-[17px] text-muted-foreground">
            If an account exists for {email}, we sent a password reset link. Check your inbox.
          </p>
          <Link href="/login" className="mt-6 inline-block text-[#0066cc] text-[14px] hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#0071e3] flex items-center justify-center text-white font-bold text-lg mx-auto">
            Rx
          </div>
          <h1 className="mt-4 text-[28px] font-normal leading-[1.14] tracking-[0.196px] text-foreground">
            Reset your password
          </h1>
          <p className="mt-2 text-[17px] text-muted-foreground">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>

        <div className="bg-card rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-[#EF4444] text-[14px]">{error}</div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[14px] text-foreground/80">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@pharmacy.com"
                required
                className="h-11"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#0071e3] text-white rounded-lg text-[17px] hover:bg-[#0077ED] transition-colors disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[14px] text-muted-foreground">
          <Link href="/login" className="text-[#0066cc] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
