import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1 text-[14px] text-[rgba(0,0,0,0.48)] mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
          {item.href ? (
            <Link href={item.href} className="text-[#0066cc] hover:underline">{item.label}</Link>
          ) : (
            <span className="text-[#1d1d1f]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
