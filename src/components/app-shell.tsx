"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Pill,
  Briefcase,
  Clock,
  BarChart3,
  UserCog,
  Settings,
  MapPin,
  Menu,
  X,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  module?: string;
  mobileTab?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard, mobileTab: true },
  { label: "Providers", href: "/app/providers", icon: Users, module: "PROVIDERS", mobileTab: true },
  { label: "Prescriptions", href: "/app/prescriptions", icon: Pill, module: "PRESCRIPTIONS", mobileTab: true },
  { label: "Drug reps", href: "/app/drug-reps", icon: Briefcase, module: "DRUG_REPS", mobileTab: true },
  { label: "Time tracking", href: "/app/time-tracking", icon: Clock, module: "TIME_TRACKING" },
  { label: "Reports", href: "/app/reports", icon: BarChart3, module: "REPORTS" },
  { label: "Team", href: "/app/team", icon: UserCog, module: "TEAM" },
  { label: "Locations", href: "/app/locations", icon: MapPin, module: "SETTINGS" },
  { label: "Settings", href: "/app/settings", icon: Settings, module: "SETTINGS" },
];

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    role: string;
    image?: string | null;
  };
  plan: string;
  permissions: Array<{ module: string; access: string }>;
  branding?: {
    brandColor?: string | null;
    brandName?: string | null;
    logoUrl?: string | null;
  };
}

export function AppShell({ children, user, plan, permissions, branding }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const hasAccess = (module?: string) => {
    if (!module) return true;
    if (user.role === "OWNER") return true;
    const perm = permissions.find((p) => p.module === module);
    return perm ? perm.access !== "NONE" : false;
  };

  const visibleNav = navItems.filter((item) => hasAccess(item.module));
  const mobileTabs = visibleNav.filter((item) => item.mobileTab).slice(0, 4);
  const moreItems = visibleNav.filter((item) => !mobileTabs.includes(item));

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const brandName = branding?.brandName || "RxDesk";

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:w-60 flex-col fixed inset-y-0 left-0 z-40"
        style={{
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
        }}
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-[#0071e3] flex items-center justify-center text-white font-semibold text-sm">
            Rx
          </div>
          <span className="text-white font-semibold tracking-tight">{brandName}</span>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-[#0071e3] text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-white/10">
          <Link
            href="/app/profile"
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-medium">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <p className="text-white/50 text-xs truncate">{user.role}</p>
            </div>
          </Link>
          <div className="mt-1 px-2">
            <Badge variant="outline" className="text-white/60 border-white/20 text-[10px]">
              {plan}
            </Badge>
          </div>
        </div>
      </aside>

      {/* Mobile top header */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-4"
        style={{
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#0071e3] flex items-center justify-center text-white font-semibold text-xs">
            Rx
          </div>
          <span className="text-white font-semibold text-sm">{brandName}</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-white p-1"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/90 pt-14">
          <nav className="p-4 space-y-1">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-base",
                    isActive ? "bg-[#0071e3] text-white" : "text-white/70"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-60 pt-14 md:pt-0 pb-20 md:pb-0 overflow-y-auto">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
      </main>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-black/5 flex items-center justify-around z-40 px-2">
        {mobileTabs.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1",
                isActive ? "text-[#0071e3]" : "text-[rgba(0,0,0,0.48)]"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
        {moreItems.length > 0 && (
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1",
              moreMenuOpen ? "text-[#0071e3]" : "text-[rgba(0,0,0,0.48)]"
            )}
            aria-label="More navigation options"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px]">More</span>
          </button>
        )}
      </nav>

      {/* More menu */}
      {moreMenuOpen && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-black/5 z-30 p-3">
          {moreItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#1d1d1f] hover:bg-[#f5f5f7]"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
