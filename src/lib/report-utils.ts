export function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = String(val);
        return str.includes(",") || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

export function defaultDateRange(): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  return { startDate, endDate };
}

export function parseDateRange(req: Request): {
  startDate: Date;
  endDate: Date;
  locationId?: string;
} {
  const url = new URL(req.url);
  const startStr = url.searchParams.get("startDate");
  const endStr = url.searchParams.get("endDate");
  const locationId = url.searchParams.get("locationId") || undefined;

  const { startDate: defaultStart, endDate: defaultEnd } = defaultDateRange();

  return {
    startDate: startStr ? new Date(startStr) : defaultStart,
    endDate: endStr ? new Date(endStr) : defaultEnd,
    locationId,
  };
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/**
 * Group an array of Date-stamped records by day, week, or month.
 * Returns ISO strings as period keys.
 */
export function groupByPeriod(
  date: Date,
  groupBy: "day" | "week" | "month"
): string {
  const d = new Date(date);
  if (groupBy === "day") {
    return d.toISOString().slice(0, 10);
  }
  if (groupBy === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  // week: Monday-based ISO week start
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

export function percentChange(current: number, prior: number): number {
  if (prior === 0 && current === 0) return 0;
  if (prior === 0) return 100;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

export function roundTo(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
