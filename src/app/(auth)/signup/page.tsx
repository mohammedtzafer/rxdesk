"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Mail, Eye, EyeOff } from "lucide-react";

type Step = "account" | "verify" | "pharmacy" | "done";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then(r => {
      if (r.status === 401) {
        // Not logged in, stay on account step
      } else if (r.ok) {
        // Already has org, go to dashboard
        router.push("/app/dashboard");
        router.refresh();
      } else {
        // Logged in but no org — go to pharmacy step
        setStep("pharmacy");
      }
    }).catch(() => {});
  }, [router]);

  // Account fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const getPasswordStrength = (pw: string): number => {
    if (pw.length < 8) return 1;
    let score = 1;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };
  const strength = getPasswordStrength(password);
  const strengthColors: Record<number, string> = { 1: "bg-[#EF4444]", 2: "bg-[#F59E0B]", 3: "bg-[#22C55E]", 4: "bg-[#22C55E]" };
  const strengthLabels: Record<number, string> = { 1: "Weak", 2: "Fair", 3: "Strong", 4: "Very strong" };

  // Pharmacy fields
  const [pharmacyName, setPharmacyName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        return;
      }

      setStep("verify");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/setup-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pharmacyName,
          timezone,
          locationName: locationName || pharmacyName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to set up pharmacy");
        return;
      }

      setStep("done");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (step === "verify") {
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
            We sent a verification link to <strong>{email}</strong>. Click it to verify your account and then sign in.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 px-6 py-2.5 bg-[#0071e3] text-white rounded-lg text-[17px] hover:bg-[#0077ED] transition-colors"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-[#22C55E] flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h1 className="mt-6 text-[28px] font-normal leading-[1.14] tracking-[0.196px] text-foreground">
            You&apos;re all set
          </h1>
          <p className="mt-2 text-[17px] text-muted-foreground">
            Your pharmacy is ready. Start by adding providers or uploading prescription data.
          </p>
          <button
            onClick={() => {
              router.push("/app/dashboard");
              router.refresh();
            }}
            className="mt-6 px-6 py-2.5 bg-[#0071e3] text-white rounded-lg text-[17px] hover:bg-[#0077ED] transition-colors"
          >
            Go to dashboard
          </button>
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
            {step === "account" ? "Create your account" : "Set up your pharmacy"}
          </h1>
          <div className="mt-3 flex gap-2 justify-center" role="progressbar" aria-valuenow={step === "account" ? 1 : 2} aria-valuemin={1} aria-valuemax={2}>
            <div className="w-8 h-1 rounded-full bg-[#0071e3]" />
            <div
              className={`w-8 h-1 rounded-full ${
                step === "pharmacy" ? "bg-[#0071e3]" : "bg-black/10"
              }`}
            />
          </div>
        </div>

        <div className="bg-card rounded-xl p-6">
          {error && (
            <div role="alert" className="mb-4 p-3 rounded-lg bg-red-50 text-[#EF4444] text-[14px]">
              {error}
            </div>
          )}

          {step === "account" && (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
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
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8+ characters"
                    required
                    minLength={8}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-[rgba(0,0,0,0.6)] transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-1.5">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= strength ? strengthColors[strength] : "bg-muted"
                        }`} />
                      ))}
                    </div>
                    <p className="text-[12px] mt-0.5 text-muted-foreground">{strengthLabels[strength]}</p>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#0071e3] text-white rounded-lg text-[17px] hover:bg-[#0077ED] transition-colors disabled:opacity-50"
              >
                {loading ? "Creating..." : "Continue"}
              </button>
            </form>
          )}

          {step === "pharmacy" && (
            <form onSubmit={handleSetupPharmacy} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pharmacyName">Pharmacy name</Label>
                <Input
                  id="pharmacyName"
                  value={pharmacyName}
                  onChange={(e) => setPharmacyName(e.target.value)}
                  placeholder="Valley Health Pharmacy"
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="locationName">Location name</Label>
                <Input
                  id="locationName"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Main store"
                  className="h-11"
                />
                <p className="text-[12px] text-muted-foreground">
                  Leave blank to use pharmacy name
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-11 rounded-lg border border-border px-3 text-[14px] bg-card"
                >
                  <option value="America/New_York">Eastern</option>
                  <option value="America/Chicago">Central</option>
                  <option value="America/Denver">Mountain</option>
                  <option value="America/Los_Angeles">Pacific</option>
                  <option value="America/Anchorage">Alaska</option>
                  <option value="Pacific/Honolulu">Hawaii</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#0071e3] text-white rounded-lg text-[17px] hover:bg-[#0077ED] transition-colors disabled:opacity-50"
              >
                {loading ? "Setting up..." : "Create pharmacy"}
              </button>
            </form>
          )}
        </div>

        {step === "account" && (
          <p className="mt-4 text-center text-[14px] text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-[#0066cc] hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
