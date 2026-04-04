"use client";

import { useState, useEffect } from "react";
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
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Calendar,
  CalendarDays,
  UserCircle,
  Wrench,
  Upload,
  Search,
  TrendingUp,
  HelpCircle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SubNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  module?: string;
  mobileTab?: boolean;
  children?: SubNavItem[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard, mobileTab: true },
  {
    label: "Providers",
    href: "/app/providers",
    icon: Users,
    module: "PROVIDERS",
    mobileTab: true,
    children: [
      { label: "Directory", href: "/app/providers", icon: Users },
      { label: "Search NPI", href: "/app/providers/search", icon: Search },
    ],
  },
  {
    label: "Prescriptions",
    href: "/app/prescriptions",
    icon: Pill,
    module: "PRESCRIPTIONS",
    mobileTab: true,
    children: [
      { label: "Analytics", href: "/app/prescriptions", icon: TrendingUp },
      { label: "Upload CSV", href: "/app/prescriptions/upload", icon: Upload },
    ],
  },
  {
    label: "Drug Reps",
    href: "/app/drug-reps",
    icon: Briefcase,
    module: "DRUG_REPS",
    mobileTab: true,
    children: [
      { label: "Directory", href: "/app/drug-reps", icon: Briefcase },
      { label: "Correlations", href: "/app/drug-reps/correlations", icon: TrendingUp },
    ],
  },
  {
    label: "Time Tracking",
    href: "/app/time-tracking",
    icon: Clock,
    module: "TIME_TRACKING",
    children: [
      { label: "Clock In/Out", href: "/app/time-tracking", icon: Clock },
      { label: "Schedule", href: "/app/time-tracking/schedule", icon: CalendarDays },
      { label: "Planner", href: "/app/time-tracking/planner", icon: Calendar },
      { label: "Team", href: "/app/time-tracking/team", icon: Users },
      { label: "Time Off", href: "/app/time-tracking/time-off", icon: Calendar },
      { label: "Roles", href: "/app/time-tracking/roles", icon: Wrench },
      { label: "Planned vs Actual", href: "/app/time-tracking/comparison", icon: BarChart3 },
    ],
  },
  { label: "Reports", href: "/app/reports", icon: BarChart3, module: "REPORTS" },
  { label: "Team", href: "/app/team", icon: UserCog, module: "TEAM" },
  { label: "Locations", href: "/app/locations", icon: MapPin, module: "SETTINGS" },
  { label: "Settings", href: "/app/settings", icon: Settings, module: "SETTINGS" },
  { label: "FAQ", href: "/app/faq", icon: HelpCircle },
  { label: "Release Notes", href: "/app/release-notes", icon: FileText },
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
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Auto-expand the section that contains the current path
  useEffect(() => {
    for (const item of navItems) {
      if (item.children && pathname.startsWith(item.href)) {
        setExpandedSections((prev) => new Set([...prev, item.href]));
      }
    }
  }, [pathname]);

  // Prevent body scroll when mobile menu or more menu is open
  useEffect(() => {
    if (mobileMenuOpen || moreMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen, moreMenuOpen]);

  const hasAccess = (module?: string) => {
    if (!module) return true;
    if (user.role === "OWNER") return true;
    const perm = permissions.find((p) => p.module === module);
    return perm ? perm.access !== "NONE" : false;
  };

  const toggleSection = (href: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  };

  const visibleNav = navItems.filter((item) => hasAccess(item.module));
  const mobileTabs = visibleNav.filter((item) => item.mobileTab).slice(0, 4);
  const moreItems = visibleNav.filter((item) => !mobileTabs.includes(item));

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const brandName = branding?.brandName || "RxDesk";

  const isExactActive = (href: string) => pathname === href;
  const isSectionActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed inset-y-0 left-0 z-40 transition-all duration-200",
          collapsed ? "md:w-16" : "md:w-60"
        )}
        style={{
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-14 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#0071e3] flex items-center justify-center text-white font-semibold text-sm shrink-0">
              Rx
            </div>
            {!collapsed && (
              <span className="text-white font-semibold tracking-tight truncate">{brandName}</span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = isSectionActive(item.href);
            const isExpanded = expandedSections.has(item.href);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.href}>
                {/* Parent nav item */}
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors flex-1 min-w-0",
                      isActive && !hasChildren
                        ? "bg-[#0071e3] text-white"
                        : isActive && hasChildren
                        ? "text-white"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                  {hasChildren && !collapsed && (
                    <button
                      onClick={() => toggleSection(item.href)}
                      className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors shrink-0"
                      aria-label={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Sub-navigation */}
                {hasChildren && isExpanded && !collapsed && (
                  <div className="ml-4 pl-3 border-l border-white/10 mt-0.5 space-y-0.5">
                    {item.children!.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = isExactActive(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors",
                            isChildActive
                              ? "bg-[#0071e3] text-white"
                              : "text-white/50 hover:text-white hover:bg-white/10"
                          )}
                        >
                          <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-2 py-3 border-t border-white/10">
          <Link
            href="/app/profile"
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors"
            title={collapsed ? user.name : undefined}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-medium shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.name}</p>
                <p className="text-white/50 text-xs truncate">{user.role}</p>
              </div>
            )}
          </Link>
          {!collapsed && (
            <div className="mt-1 px-2">
              <Badge variant="outline" className="text-white/60 border-white/20 text-[10px]">
                {plan}
              </Badge>
            </div>
          )}
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
          <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const isActive = isSectionActive(item.href);
              return (
                <div key={item.href}>
                  <Link
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
                  {item.children && isActive && (
                    <div className="ml-8 mt-1 space-y-0.5">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-md text-[14px]",
                              isExactActive(child.href) ? "text-white" : "text-white/50"
                            )}
                          >
                            <ChildIcon className="w-4 h-4" />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main content */}
      <main
        className={cn(
          "flex-1 pt-14 md:pt-0 pb-[88px] md:pb-0 overflow-y-auto transition-all duration-200",
          collapsed ? "md:ml-16" : "md:ml-60"
        )}
      >
        <div className="p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
      </main>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-white border-t border-black/5 flex items-center justify-around z-40 px-2">
        {mobileTabs.map((item) => {
          const Icon = item.icon;
          const isActive = isSectionActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 min-h-[48px] min-w-[48px] justify-center",
                isActive ? "text-[#0071e3]" : "text-[rgba(0,0,0,0.48)]"
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[11px]">{item.label}</span>
            </Link>
          );
        })}
        {moreItems.length > 0 && (
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 min-h-[48px] min-w-[48px] justify-center",
              moreMenuOpen ? "text-[#0071e3]" : "text-[rgba(0,0,0,0.48)]"
            )}
            aria-label="More navigation options"
          >
            <MoreHorizontal className="w-6 h-6" />
            <span className="text-[11px]">More</span>
          </button>
        )}
      </nav>

      {/* More menu */}
      {moreMenuOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/20 z-20" onClick={() => setMoreMenuOpen(false)} />
          <div className="md:hidden fixed bottom-[72px] left-0 right-0 bg-white border-t border-black/5 z-30 p-3 rounded-t-xl shadow-lg">
            {moreItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    isSectionActive(item.href) ? "bg-[#0071e3]/10 text-[#0071e3] font-medium" : "text-[#1d1d1f] hover:bg-[#f5f5f7]"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
