"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Palette, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface OrgSettings {
  id: string;
  name: string;
  timezone: string;
  plan: string;
  trialEndsAt: string | null;
  brandColor: string | null;
  logoUrl: string | null;
  brandName: string | null;
}

type Tab = "general" | "branding" | "billing";

const TABS = [
  { key: "general" as const, label: "General", icon: Building2 },
  { key: "branding" as const, label: "Branding", icon: Palette },
  { key: "billing" as const, label: "Billing", icon: CreditCard },
];

const PLANS = [
  {
    key: "STARTER",
    name: "Starter",
    price: "$99",
    features: ["1 location", "50 providers", "3 team members"],
  },
  {
    key: "GROWTH",
    name: "Growth",
    price: "$199",
    features: ["3 locations", "Unlimited providers", "15 team members"],
  },
  {
    key: "PRO",
    name: "Pro",
    price: "$299",
    features: ["Unlimited locations", "Unlimited providers", "Unlimited team"],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("general");

  const [form, setForm] = useState({
    name: "",
    timezone: "America/New_York",
    brandColor: "",
    brandName: "",
    logoUrl: "",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: OrgSettings | null) => {
        if (data) {
          setSettings(data);
          setForm({
            name: data.name ?? "",
            timezone: data.timezone ?? "America/New_York",
            brandColor: data.brandColor ?? "",
            brandName: data.brandName ?? "",
            logoUrl: data.logoUrl ?? "",
          });
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        timezone: form.timezone,
        brandColor: form.brandColor || null,
        brandName: form.brandName || null,
        logoUrl: form.logoUrl || null,
      }),
    });
    if (res.ok) {
      const data: OrgSettings = await res.json();
      setSettings(data);
      toast.success("Settings saved");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to save settings");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
          Settings
        </h1>
        <div className="mt-6 flex gap-1 bg-white rounded-lg p-1 w-fit">
          <div className="h-9 w-24 rounded-md bg-[rgba(0,0,0,0.05)] animate-pulse" />
          <div className="h-9 w-24 rounded-md bg-[rgba(0,0,0,0.05)] animate-pulse" />
          <div className="h-9 w-24 rounded-md bg-[rgba(0,0,0,0.05)] animate-pulse" />
        </div>
        <div className="mt-4 bg-white rounded-xl p-6 max-w-lg h-48 animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
        Settings
      </h1>

      {/* Tab bar */}
      <div
        className="mt-6 flex gap-1 bg-white rounded-lg p-1 w-fit"
        role="tablist"
        aria-label="Settings sections"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[14px] font-medium transition-colors ${
              tab === t.key
                ? "bg-[#0071e3] text-white"
                : "text-[rgba(0,0,0,0.48)] hover:text-[#1d1d1f]"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* General tab */}
      {tab === "general" && (
        <form
          onSubmit={handleSave}
          className="mt-4 bg-white rounded-xl p-6 space-y-4 max-w-lg"
          role="tabpanel"
          aria-label="General settings"
        >
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="h-10"
              placeholder="Acme Pharmacy"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-timezone">Timezone</Label>
            <select
              id="org-timezone"
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full h-10 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-1"
            >
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="America/Anchorage">Alaska (AKT)</option>
              <option value="Pacific/Honolulu">Hawaii (HT)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] font-medium hover:bg-[#0077ED] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      )}

      {/* Branding tab */}
      {tab === "branding" && (
        <form
          onSubmit={handleSave}
          className="mt-4 bg-white rounded-xl p-6 space-y-4 max-w-lg"
          role="tabpanel"
          aria-label="Branding settings"
        >
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">Brand name</Label>
            <Input
              id="brand-name"
              value={form.brandName}
              onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              placeholder="Leave blank to use RxDesk"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-color-text">Brand color</Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={form.brandColor || "#0071e3"}
                onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                className="w-10 h-10 rounded-lg border border-[rgba(0,0,0,0.08)] cursor-pointer p-0.5"
                aria-label="Color picker"
              />
              <Input
                id="brand-color-text"
                value={form.brandColor}
                onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                placeholder="#0071e3"
                className="h-10 flex-1 font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logo-url">Logo URL</Label>
            <Input
              id="logo-url"
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="https://yourdomain.com/logo.png"
              className="h-10"
              type="url"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] font-medium hover:bg-[#0077ED] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save branding"}
          </button>
        </form>
      )}

      {/* Billing tab */}
      {tab === "billing" && (
        <div
          className="mt-4 bg-white rounded-xl p-6 max-w-lg"
          role="tabpanel"
          aria-label="Billing settings"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[13px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                Current plan
              </p>
              <p className="text-[28px] font-semibold text-[#1d1d1f] mt-1 capitalize">
                {settings?.plan?.toLowerCase() ?? "—"}
              </p>
            </div>
            {settings?.trialEndsAt && new Date(settings.trialEndsAt) > new Date() && (
              <span className="inline-flex items-center text-[12px] font-medium px-3 py-1 rounded-full bg-[#0071e3]/10 text-[#0071e3]">
                Trial ends{" "}
                {new Date(settings.trialEndsAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {PLANS.map((plan) => {
              const isActive =
                settings?.plan?.toUpperCase() === plan.key;
              return (
                <div
                  key={plan.key}
                  className={`p-4 rounded-xl border transition-colors ${
                    isActive
                      ? "border-[#0071e3] bg-[#0071e3]/5"
                      : "border-[rgba(0,0,0,0.08)]"
                  }`}
                >
                  <p className="text-[14px] font-semibold text-[#1d1d1f]">
                    {plan.name}
                  </p>
                  <p className="text-[21px] font-bold text-[#1d1d1f] mt-1">
                    {plan.price}
                    <span className="text-[12px] font-normal text-[rgba(0,0,0,0.48)]">
                      /mo
                    </span>
                  </p>
                  <ul className="mt-3 space-y-1">
                    {plan.features.map((f) => (
                      <li key={f} className="text-[12px] text-[rgba(0,0,0,0.48)]">
                        · {f}
                      </li>
                    ))}
                  </ul>
                  {!isActive && (
                    <button className="mt-4 w-full h-8 rounded-lg border border-[#0071e3] text-[#0071e3] text-[12px] font-medium hover:bg-[#0071e3] hover:text-white transition-colors">
                      Switch to {plan.name}
                    </button>
                  )}
                  {isActive && (
                    <p className="mt-4 text-[12px] font-semibold text-[#0071e3] text-center">
                      Current plan
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
