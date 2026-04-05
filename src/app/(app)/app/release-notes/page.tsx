const releases = [
  {
    version: "v0.6.0",
    date: "04/04/2026",
    title: "PharmShift scheduling integration",
    highlights: [
      "Daily timeline with visual schedule bars and ruler header",
      "Weekly planner grid editor with conflict detection",
      "Schedule workflow: Not Started → In Progress → Finalized",
      "Employee availability, reordering, and role management",
      "Copy previous week schedules",
      "Auto-notify employees when schedule published or updated",
    ],
  },
  {
    version: "v0.5.0",
    date: "04/04/2026",
    title: "Live pages + Resend integration",
    highlights: [
      "Full provider detail page with analytics, drugs, and notes tabs",
      "Live dashboard pulling real data from APIs",
      "Locations CRUD with card grid UI",
      "Email via Resend sandbox",
    ],
  },
  {
    version: "v0.4.0",
    date: "04/04/2026",
    title: "Full UI build",
    highlights: [
      "Time tracking: clock in/out, entries table, manual entry",
      "PTO: submit requests, approve/deny with status filters",
      "Team management: invite, permissions editor, deactivate/reactivate",
      "Settings: general, branding, billing tabs",
      "Profile with notification list",
    ],
  },
  {
    version: "v0.3.0",
    date: "04/04/2026",
    title: "Time tracking + notifications",
    highlights: [
      "Clock in/out, time entries, overtime calculation",
      "PTO management with submit/approve/deny",
      "In-app + email notification system (11 event types)",
      "Scheduling infrastructure (schema ready)",
    ],
  },
  {
    version: "v0.2.0",
    date: "04/04/2026",
    title: "Auth enhancements + data protection",
    highlights: [
      "Email verification required on signup",
      "Password reset with rate-limited token flow",
      "Seed script requires --force flag for data protection",
    ],
  },
  {
    version: "v0.1.0",
    date: "04/04/2026",
    title: "Initial MVP",
    highlights: [
      "Core platform: auth, permissions, multi-location, team, billing",
      "Provider directory with NPPES NPI search",
      "Prescription analytics: CSV upload, trends, alerts",
      "Drug rep tracker: visits, correlations, brand shift detection",
      "Apple design system throughout",
    ],
  },
];

export default function ReleaseNotesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-foreground">Release notes</h1>
        <p className="mt-2 text-[17px] text-muted-foreground">What's new in RxDesk.</p>
      </div>

      <div className="max-w-2xl">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[rgba(0,0,0,0.08)]" aria-hidden="true" />

          <div className="space-y-8">
            {releases.map((release, i) => (
              <div key={release.version} className="relative pl-8">
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    i === 0 ? "bg-[#0071e3]" : "bg-[rgba(0,0,0,0.15)]"
                  }`}
                  aria-hidden="true"
                />

                <div className="bg-card rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            i === 0
                              ? "bg-[#0071e3]/10 text-[#0071e3]"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {release.version}
                        </span>
                        {i === 0 && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E]">
                            Latest
                          </span>
                        )}
                      </div>
                      <h2 className="text-[17px] font-semibold text-foreground mt-1">{release.title}</h2>
                    </div>
                    <span className="text-[12px] text-muted-foreground shrink-0 pt-0.5">{release.date}</span>
                  </div>

                  <ul className="space-y-1.5">
                    {release.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] text-[rgba(0,0,0,0.6)]">
                        <span className="text-[#0071e3] mt-[3px] shrink-0" aria-hidden="true">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
