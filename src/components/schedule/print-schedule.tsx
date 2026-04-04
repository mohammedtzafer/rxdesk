"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";
import { EmployeeWithAvailability, DAYS_OF_WEEK } from "@/lib/schedule-types";
import { timeToDecimal } from "@/lib/schedule-time-utils";

interface PrintScheduleProps {
  employees: EmployeeWithAvailability[];
  weekLabel: string;
  locationName: string;
  onPrint?: () => void;
}

export function PrintSchedule({ employees, weekLabel, locationName }: PrintScheduleProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const content = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Schedule — ${locationName} — ${weekLabel}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; margin: 20px; color: #1d1d1f; }
          h1 { font-size: 24px; margin: 0 0 4px 0; }
          h2 { font-size: 14px; color: rgba(0,0,0,0.48); margin: 0 0 20px 0; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f5f5f7; padding: 8px 6px; text-align: left; border: 1px solid #e5e5e5; font-weight: 600; }
          td { padding: 6px; border: 1px solid #e5e5e5; vertical-align: top; white-space: pre-line; }
          .off { color: rgba(0,0,0,0.3); }
          .total { font-weight: 600; text-align: right; }
          @media print { body { margin: 10px; } }
        </style>
      </head>
      <body>
        ${content}
        <script>window.print(); window.close();<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  function calcHours(emp: EmployeeWithAvailability): { days: Record<string, number>; total: number } {
    const days: Record<string, number> = {};
    let total = 0;
    for (const day of DAYS_OF_WEEK) {
      const avail = emp.availability[day];
      if (avail.available) {
        const h = timeToDecimal(avail.endTime) - timeToDecimal(avail.startTime);
        days[day] = Math.round(h * 100) / 100;
        total += h;
      } else {
        days[day] = 0;
      }
    }
    return { days, total: Math.round(total * 100) / 100 };
  }

  return (
    <>
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-2 px-3 py-1.5 border border-[rgba(0,0,0,0.08)] rounded-lg text-[13px] text-[#1d1d1f] hover:bg-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-1"
        aria-label="Print schedule"
      >
        <Printer className="w-3.5 h-3.5" />
        Print
      </button>

      {/* Hidden print content */}
      <div className="hidden">
        <div ref={printRef}>
          <h1>{locationName}</h1>
          <h2>{weekLabel}</h2>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                {DAYS_OF_WEEK.map((d) => (
                  <th key={d}>{d.slice(0, 3)}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const { days, total } = calcHours(emp);
                return (
                  <tr key={emp.id}>
                    <td>
                      <strong>{emp.name}</strong>
                    </td>
                    {DAYS_OF_WEEK.map((day) => {
                      const avail = emp.availability[day];
                      return (
                        <td key={day} className={!avail.available ? "off" : ""}>
                          {avail.available
                            ? `${avail.startTime} – ${avail.endTime}\n(${avail.role}) ${days[day]}h`
                            : "OFF"}
                        </td>
                      );
                    })}
                    <td className="total">{total}h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
