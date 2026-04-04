# RxDesk reporting suite design

**Date:** 04/04/2026
**Author:** Product Lead
**Status:** Draft -- ready for architect handoff

---

## Overview

28 reports across 7 categories. Each report specifies data sources, metrics, filters, visualization, export, and frequency. Build readiness is assessed against the current Prisma schema -- "Build now" means all required data exists in current models with no new integrations needed.

---

## 1. Prescription and clinical (5 reports)

### 1.1 Prescription volume trend

| Field | Detail |
|-------|--------|
| **Name** | Prescription volume trend |
| **Users** | Owner, Pharmacist |
| **Data sources** | `PrescriptionRecord` (fillDate, locationId) |
| **Key metrics** | Total Rx count per day/week/month, % change period-over-period, avg Rx per day, peak fill day of week |
| **Filters** | Date range, location, provider, payer type, generic flag |
| **Visualization** | Line chart (trend) + summary cards (total, avg, % change) |
| **Export** | CSV, PDF |
| **Frequency** | Real-time (on-demand query) |
| **Build status** | **Build now** -- all fields exist on `PrescriptionRecord` |

### 1.2 Top drugs dispensed

| Field | Detail |
|-------|--------|
| **Name** | Top drugs dispensed |
| **Users** | Owner, Pharmacist |
| **Data sources** | `PrescriptionRecord` (drugName, drugNdc, quantity, fillDate) |
| **Key metrics** | Rx count by drug name, total quantity dispensed, rank position, % of total volume, generic vs brand split per drug |
| **Filters** | Date range, location, top N (10/25/50), payer type, generic only / brand only |
| **Visualization** | Horizontal bar chart (top 10) + sortable table (full list) |
| **Export** | CSV, PDF |
| **Frequency** | Daily / on-demand |
| **Build status** | **Build now** |

### 1.3 Payer mix analysis

| Field | Detail |
|-------|--------|
| **Name** | Payer mix analysis |
| **Users** | Owner |
| **Data sources** | `PrescriptionRecord` (payerType, fillDate, locationId) |
| **Key metrics** | Rx count by payer type (Commercial, Medicare, Medicaid, Cash, Other), % distribution, payer mix trend over time, cash pay % |
| **Filters** | Date range, location, drug name |
| **Visualization** | Donut chart (current period) + stacked area chart (trend) |
| **Export** | CSV, PDF |
| **Frequency** | Weekly / on-demand |
| **Build status** | **Build now** |

### 1.4 Generic dispensing rate

| Field | Detail |
|-------|--------|
| **Name** | Generic dispensing rate (GDR) |
| **Users** | Owner, Pharmacist |
| **Data sources** | `PrescriptionRecord` (isGeneric, fillDate) |
| **Key metrics** | GDR % (generic Rx / total Rx), GDR trend over time, GDR by provider, GDR by payer type, industry benchmark comparison (hardcoded 90% target) |
| **Filters** | Date range, location, provider, payer type |
| **Visualization** | Gauge chart (current GDR) + line chart (trend) + table by provider |
| **Export** | CSV, PDF |
| **Frequency** | Monthly / on-demand |
| **Build status** | **Build now** |

### 1.5 Refill compliance tracker

| Field | Detail |
|-------|--------|
| **Name** | Refill compliance tracker |
| **Users** | Pharmacist |
| **Data sources** | `PrescriptionEvent` (eventType: RX_REFILL_DUE, RX_FILLED), `Patient` |
| **Key metrics** | Refills due count, refills completed count, refill compliance rate %, overdue refills list, avg days overdue, compliance rate by drug |
| **Filters** | Date range, location, drug name, patient, overdue only toggle |
| **Visualization** | KPI cards + table (overdue refills with patient, drug, days overdue) |
| **Export** | CSV, PDF |
| **Frequency** | Daily / real-time |
| **Build status** | **Build now** -- uses PrescriptionEvent refillDueDate and subsequent fill events |

---

## 2. Provider and prescriber (4 reports)

### 2.1 Provider scorecard

| Field | Detail |
|-------|--------|
| **Name** | Provider scorecard |
| **Users** | Owner, Pharmacist |
| **Data sources** | `PrescriptionRecord`, `Provider`, `DrugRepVisitProvider` |
| **Key metrics** | Total Rx count per provider, Rx trend (last 3/6/12 months), top drugs prescribed, generic rate, payer mix, # of drug rep visits linked, last Rx date |
| **Filters** | Date range, location, specialty, provider tags, minimum Rx threshold |
| **Visualization** | Detail card per provider + comparison table |
| **Export** | PDF (scorecard format), CSV |
| **Frequency** | Monthly / on-demand |
| **Build status** | **Build now** |

### 2.2 Prescriber volume ranking

| Field | Detail |
|-------|--------|
| **Name** | Prescriber volume ranking |
| **Users** | Owner |
| **Data sources** | `PrescriptionRecord`, `Provider` |
| **Key metrics** | Rank by total Rx count, provider name + NPI + specialty, Rx count, % of total pharmacy volume, period-over-period change |
| **Filters** | Date range, location, specialty, top N |
| **Visualization** | Ranked table with sparkline trend per provider |
| **Export** | CSV, PDF |
| **Frequency** | Monthly / on-demand |
| **Build status** | **Build now** |

### 2.3 Prescriber trend analysis

| Field | Detail |
|-------|--------|
| **Name** | Prescriber trend analysis |
| **Users** | Owner, Pharmacist |
| **Data sources** | `PrescriptionRecord`, `Provider` |
| **Key metrics** | Rx volume per provider per month, growth/decline %, moving average, new drugs being prescribed |
| **Filters** | Date range, specific providers (multi-select), specialty, location |
| **Visualization** | Multi-line chart (selected providers over time) |
| **Export** | CSV, PDF |
| **Frequency** | Monthly / on-demand |
| **Build status** | **Build now** |

### 2.4 New and dormant provider alerts

| Field | Detail |
|-------|--------|
| **Name** | New and dormant provider alerts |
| **Users** | Owner |
| **Data sources** | `PrescriptionRecord`, `Provider` |
| **Key metrics** | New providers (first Rx in last 30/60/90 days), dormant providers (no Rx in last 60/90/120 days), provider name + NPI + specialty, last Rx date, total historical Rx count, days since last Rx |
| **Filters** | Location, dormancy threshold (days), new provider window (days), specialty |
| **Visualization** | Two tables: "New providers" and "Dormant providers" with color-coded urgency |
| **Export** | CSV, PDF |
| **Frequency** | Weekly (auto-generated) |
| **Build status** | **Build now** |

---

## 3. Drug rep and sales (4 reports)

### 3.1 Rep visit activity log

| Field | Detail |
|-------|--------|
| **Name** | Rep visit activity log |
| **Users** | Owner, Pharmacist |
| **Data sources** | `DrugRepVisit`, `DrugRep`, `DrugRepVisitProvider` |
| **Key metrics** | Visit date, rep name, company, duration (minutes), drugs promoted (list), samples left (list), providers discussed, follow-up date, notes |
| **Filters** | Date range, location, rep name, company, provider |
| **Visualization** | Sortable table with expandable row detail |
| **Export** | CSV, PDF |
| **Frequency** | Real-time / on-demand |
| **Build status** | **Build now** |

### 3.2 Rep visit frequency by company

| Field | Detail |
|-------|--------|
| **Name** | Rep visit frequency by company |
| **Users** | Owner |
| **Data sources** | `DrugRepVisit`, `DrugRep` |
| **Key metrics** | Total visits per company, avg visits per month, total duration (hours), # unique reps per company, last visit date, days since last visit |
| **Filters** | Date range, location, company |
| **Visualization** | Bar chart (visits by company) + table |
| **Export** | CSV, PDF |
| **Frequency** | Monthly / on-demand |
| **Build status** | **Build now** |

### 3.3 Visit-to-prescription correlation

| Field | Detail |
|-------|--------|
| **Name** | Visit-to-prescription correlation |
| **Users** | Owner |
| **Data sources** | `DrugRepVisit` (drugsPromoted), `PrescriptionRecord` (drugName, fillDate) |
| **Key metrics** | Drug promoted during visit, Rx volume for that drug 30/60/90 days before visit, Rx volume 30/60/90 days after visit, % change post-visit, correlation score (simple pre/post delta) |
| **Filters** | Date range, location, company, specific drug, provider |
| **Visualization** | Table with before/after comparison + bar chart per drug |
| **Export** | CSV, PDF |
| **Frequency** | Monthly / on-demand |
| **Build status** | **Build now** -- requires joining drugsPromoted JSON array against PrescriptionRecord.drugName. Complex query but no new data needed. |

### 3.4 Sample inventory tracker

| Field | Detail |
|-------|--------|
| **Name** | Sample inventory tracker |
| **Users** | Owner, Pharmacist |
| **Data sources** | `DrugRepVisit` (samplesLeft JSON) |
| **Key metrics** | Drug sample name, quantity received, date received, rep/company who left it, running total per sample drug (in minus distributed -- note: distribution tracking not yet modeled) |
| **Filters** | Date range, location, drug name, company |
| **Visualization** | Table (chronological log) |
| **Export** | CSV, PDF |
| **Frequency** | Real-time / on-demand |
| **Build status** | **Future** -- `samplesLeft` is a JSON array with no enforced schema. Sample distribution/dispensing is not tracked. Need: (1) standardized sample schema, (2) sample dispensing model to track outflow. For v1, can show inbound samples log only as a **partial build now**. |

---

## 4. Workforce and labor (6 reports)

### 4.1 Hours worked summary

| Field | Detail |
|-------|--------|
| **Name** | Hours worked summary |
| **Users** | Owner |
| **Data sources** | `TimeEntry` (regularHours, overtimeHours, breakMinutes, date, userId), `User` |
| **Key metrics** | Employee name, total hours, regular hours, overtime hours, break hours, avg hours/day, days worked, target hours vs actual |
| **Filters** | Date range (pay period), location, employee, role |
| **Visualization** | Table + stacked bar chart (regular vs OT per employee) |
| **Export** | CSV, PDF |
| **Frequency** | Weekly / per pay period |
| **Build status** | **Build now** |

### 4.2 Overtime analysis

| Field | Detail |
|-------|--------|
| **Name** | Overtime analysis |
| **Users** | Owner |
| **Data sources** | `TimeEntry` (overtimeHours, date, userId), `PayRate` (ratePerHour), `User` |
| **Key metrics** | Total OT hours per employee, OT hours trend by week, OT cost estimate (OT hours x rate x 1.5), % of total hours that are OT, top OT employees, OT by day of week |
| **Filters** | Date range, location, employee, threshold (show only employees above X OT hours) |
| **Visualization** | Bar chart (OT by employee) + line chart (OT trend over weeks) + KPI cards |
| **Export** | CSV, PDF |
| **Frequency** | Weekly |
| **Build status** | **Build now** |

### 4.3 Schedule vs actual variance

| Field | Detail |
|-------|--------|
| **Name** | Schedule vs actual variance |
| **Users** | Owner |
| **Data sources** | `ScheduleEntry` (startTime, endTime, day), `WeeklySchedule`, `TimeEntry` (startTime, endTime, date, userId) |
| **Key metrics** | Scheduled start vs actual clock-in, scheduled end vs actual clock-out, variance in minutes (early/late), total scheduled hours vs total actual hours, variance %, employees with highest variance |
| **Filters** | Date range (week), location, employee |
| **Visualization** | Table (per employee per day with color-coded variance) + summary bar chart |
| **Export** | CSV, PDF |
| **Frequency** | Weekly |
| **Build status** | **Build now** -- requires joining ScheduleEntry (by employeeId + day) with TimeEntry (by userId + date). Schedule uses string times ("9:00 AM") so parsing needed but no new data required. |

### 4.4 Attendance and punctuality

| Field | Detail |
|-------|--------|
| **Name** | Attendance and punctuality |
| **Users** | Owner |
| **Data sources** | `ScheduleEntry`, `TimeEntry`, `PtoRequest`, `WeeklySchedule` |
| **Key metrics** | Days scheduled, days worked, days absent (unexcused), days on PTO, no-call/no-show count, late arrivals (> 5 min past scheduled start), early departures, attendance rate % |
| **Filters** | Date range, location, employee |
| **Visualization** | Table per employee + heatmap calendar (present/absent/PTO per day) |
| **Export** | CSV, PDF |
| **Frequency** | Weekly / monthly |
| **Build status** | **Build now** -- same join logic as 4.3 plus PtoRequest data |

### 4.5 PTO usage report

| Field | Detail |
|-------|--------|
| **Name** | PTO usage report |
| **Users** | Owner, Technician (own data only) |
| **Data sources** | `PtoRequest` (type, startDate, endDate, status, employeeId) |
| **Key metrics** | Total PTO days used by type (vacation, sick, personal, other), PTO days pending, PTO usage trend by month, employees with most PTO, PTO by day of week |
| **Filters** | Date range, employee, PTO type, status, location |
| **Visualization** | Stacked bar chart (PTO by type per month) + table per employee |
| **Export** | CSV, PDF |
| **Frequency** | Monthly / on-demand |
| **Build status** | **Build now** |

### 4.6 Payroll summary

| Field | Detail |
|-------|--------|
| **Name** | Payroll summary |
| **Users** | Owner |
| **Data sources** | `Timesheet` (totalRegularHours, totalOvertimeHours, status), `PayRate` (ratePerHour), `User` |
| **Key metrics** | Employee name, pay period, regular hours, OT hours, total hours, hourly rate, estimated regular pay, estimated OT pay (1.5x), estimated total pay, timesheet status |
| **Filters** | Pay period, location, employee, timesheet status |
| **Visualization** | Table + summary cards (total payroll estimate, total hours, total employees) |
| **Export** | CSV, PDF |
| **Frequency** | Per pay period |
| **Build status** | **Build now** |

---

## 5. Financial (4 reports)

### 5.1 Revenue proxy (Rx volume based)

| Field | Detail |
|-------|--------|
| **Name** | Revenue proxy by Rx volume |
| **Users** | Owner |
| **Data sources** | `PrescriptionRecord` (fillDate, payerType, quantity), `PrescriptionEvent` (copay) |
| **Key metrics** | Total Rx count, estimated revenue (Rx count x configurable avg reimbursement per payer type), revenue by payer type, revenue trend by week/month, avg revenue per Rx |
| **Filters** | Date range, location, payer type |
| **Visualization** | Line chart (revenue trend) + donut (by payer) + KPI cards |
| **Export** | CSV, PDF |
| **Frequency** | Monthly / on-demand |
| **Build status** | **Build now** -- revenue is estimated using configurable avg reimbursement rates per payer type (stored as org settings). Copay data from PrescriptionEvent supplements when available. **Assumption:** We add a simple org-level config for avg reimbursement per payer type (no new model, just a JSON field or settings table). |

### 5.2 Labor cost summary

| Field | Detail |
|-------|--------|
| **Name** | Labor cost summary |
| **Users** | Owner |
| **Data sources** | `TimeEntry`, `PayRate`, `Timesheet` |
| **Key metrics** | Total labor cost (regular hours x rate + OT hours x rate x 1.5), cost by employee, cost by location, labor cost trend over pay periods, labor cost as % of estimated revenue (ties to 5.1) |
| **Filters** | Date range / pay period, location, employee |
| **Visualization** | Bar chart (cost by employee) + line chart (trend) + KPI cards |
| **Export** | CSV, PDF |
| **Frequency** | Per pay period / monthly |
| **Build status** | **Build now** -- requires PayRate to be populated for employees |

### 5.3 Rx per labor hour

| Field | Detail |
|-------|--------|
| **Name** | Rx per labor hour (productivity) |
| **Users** | Owner |
| **Data sources** | `PrescriptionRecord` (fillDate), `TimeEntry` (regularHours, overtimeHours) |
| **Key metrics** | Total Rx filled, total labor hours, Rx per labor hour ratio, ratio trend over time, ratio by location, ratio by day of week |
| **Filters** | Date range, location |
| **Visualization** | Line chart (trend) + comparison bar (by location) + KPI card |
| **Export** | CSV, PDF |
| **Frequency** | Weekly / monthly |
| **Build status** | **Build now** |

### 5.4 Payroll export history

| Field | Detail |
|-------|--------|
| **Name** | Payroll export history |
| **Users** | Owner |
| **Data sources** | `PayrollExport` |
| **Key metrics** | Export date, period covered, format (ADP/Paychex/etc), total employees, total hours, total OT hours, file name, status (generated/downloaded/submitted), created by |
| **Filters** | Date range, format, status |
| **Visualization** | Table |
| **Export** | CSV |
| **Frequency** | On-demand |
| **Build status** | **Build now** |

---

## 6. Operational (3 reports)

### 6.1 Fill-to-pickup time

| Field | Detail |
|-------|--------|
| **Name** | Fill-to-pickup time |
| **Users** | Owner, Pharmacist |
| **Data sources** | `PrescriptionEvent` (eventType: RX_READY readyAt, RX_PICKED_UP pickedUpAt) |
| **Key metrics** | Avg time from ready to pickup (hours), median pickup time, % picked up within 2/4/8/24 hours, not-yet-picked-up count, trend over time, breakdown by day of week |
| **Filters** | Date range, location, drug name |
| **Visualization** | Histogram (pickup time distribution) + line chart (avg trend) + KPI cards |
| **Export** | CSV, PDF |
| **Frequency** | Daily / on-demand |
| **Build status** | **Build now** -- readyAt and pickedUpAt exist on PrescriptionEvent |

### 6.2 Prescription workflow funnel

| Field | Detail |
|-------|--------|
| **Name** | Prescription workflow funnel |
| **Users** | Owner, Pharmacist |
| **Data sources** | `PrescriptionEvent` (eventType progression: RX_NEW -> RX_FILLED -> RX_READY -> RX_PICKED_UP) |
| **Key metrics** | Count at each stage, conversion rate between stages, avg time between stages, drop-off rate (cancelled / on hold at each stage), current backlog per stage |
| **Filters** | Date range, location |
| **Visualization** | Funnel chart + table with stage metrics |
| **Export** | CSV, PDF |
| **Frequency** | Real-time / daily |
| **Build status** | **Build now** -- requires grouping PrescriptionEvents by externalRxId to build per-Rx timelines. externalRxId must be populated for this to work. |

### 6.3 Patient notification delivery

| Field | Detail |
|-------|--------|
| **Name** | Patient notification delivery |
| **Users** | Owner, Pharmacist |
| **Data sources** | `PatientNotification` (channel, status, sentAt, deliveredAt, failReason) |
| **Key metrics** | Total sent, delivery rate %, failure rate %, breakdown by channel (SMS/voice/email), breakdown by status (pending/sent/delivered/failed/opted-out), failure reasons, avg time to delivery, opted-out count |
| **Filters** | Date range, location, channel, status, template |
| **Visualization** | KPI cards + donut (by channel) + bar chart (delivery status) + table (failures) |
| **Export** | CSV, PDF |
| **Frequency** | Daily / on-demand |
| **Build status** | **Build now** |

---

## 7. Compliance (2 reports)

### 7.1 Audit trail report

| Field | Detail |
|-------|--------|
| **Name** | Audit trail report |
| **Users** | Owner |
| **Data sources** | `AuditLog` (action, entityType, entityId, userId, metadata, createdAt) |
| **Key metrics** | Timestamp, user name, action performed, entity type, entity ID, metadata detail, filterable chronological log |
| **Filters** | Date range, user, action type, entity type |
| **Visualization** | Sortable table with expandable metadata |
| **Export** | CSV, PDF |
| **Frequency** | Real-time / on-demand |
| **Build status** | **Build now** |

### 7.2 Controlled substance dispensing log

| Field | Detail |
|-------|--------|
| **Name** | Controlled substance dispensing log |
| **Users** | Owner, Pharmacist |
| **Data sources** | `PrescriptionRecord` (drugName, drugNdc), `DrugReference` (dea schedule), `Provider` |
| **Key metrics** | Drug name, DEA schedule (II-V), NDC, fill date, quantity, days supply, prescriber NPI + name, patient count (if linked via PrescriptionEvent), total quantity per drug per period |
| **Filters** | Date range, location, DEA schedule, drug name, provider |
| **Visualization** | Table + summary cards (total controlled Rx, breakdown by schedule) |
| **Export** | CSV, PDF |
| **Frequency** | Daily / on-demand |
| **Build status** | **Build now** -- requires `DrugReference.dea` field to be populated for drugs in use. If DEA schedule data is not yet loaded into DrugReference, this becomes **partial build now** (report structure works, but relies on DrugReference being seeded with DEA classifications). |

---

## Build readiness summary

### Build now (24 reports)

These reports use only existing models and fields. No new tables, APIs, or integrations required.

| # | Report | Category | Complexity |
|---|--------|----------|------------|
| 1.1 | Prescription volume trend | Rx & Clinical | Low |
| 1.2 | Top drugs dispensed | Rx & Clinical | Low |
| 1.3 | Payer mix analysis | Rx & Clinical | Low |
| 1.4 | Generic dispensing rate | Rx & Clinical | Low |
| 1.5 | Refill compliance tracker | Rx & Clinical | Medium |
| 2.1 | Provider scorecard | Provider | Medium |
| 2.2 | Prescriber volume ranking | Provider | Low |
| 2.3 | Prescriber trend analysis | Provider | Low |
| 2.4 | New and dormant provider alerts | Provider | Medium |
| 3.1 | Rep visit activity log | Drug Rep | Low |
| 3.2 | Rep visit frequency by company | Drug Rep | Low |
| 3.3 | Visit-to-prescription correlation | Drug Rep | High |
| 4.1 | Hours worked summary | Workforce | Low |
| 4.2 | Overtime analysis | Workforce | Medium |
| 4.3 | Schedule vs actual variance | Workforce | High |
| 4.4 | Attendance and punctuality | Workforce | High |
| 4.5 | PTO usage report | Workforce | Low |
| 4.6 | Payroll summary | Workforce | Medium |
| 5.1 | Revenue proxy | Financial | Medium |
| 5.2 | Labor cost summary | Financial | Medium |
| 5.3 | Rx per labor hour | Financial | Low |
| 5.4 | Payroll export history | Financial | Low |
| 6.1 | Fill-to-pickup time | Operational | Medium |
| 6.2 | Prescription workflow funnel | Operational | High |
| 6.3 | Patient notification delivery | Operational | Low |
| 7.1 | Audit trail report | Compliance | Low |

### Build now with caveats (2 reports)

| # | Report | Caveat |
|---|--------|--------|
| 7.2 | Controlled substance dispensing log | Requires DrugReference.dea to be seeded with DEA schedule data |
| 5.1 | Revenue proxy | Needs org-level avg reimbursement config (minor schema addition -- JSON field on Organization or a ReimbursementRate settings model) |

### Future (1 report)

| # | Report | What's needed |
|---|--------|---------------|
| 3.4 | Sample inventory tracker (full) | Need standardized sample schema (not free-form JSON), sample dispensing/distribution model to track outflow. Inbound log is buildable now. |

### Missing reports deferred to v2

These were considered but excluded from v1 to keep scope manageable:

- **Drug interaction alerts** -- requires real-time interaction checking against DrugReference, plus patient medication history aggregation. Complex clinical feature, not a report.
- **PDMP export** -- requires state-specific formatting and integration with state PDMP systems. Regulatory complexity too high for v1.
- **Inventory valuation** -- no inventory/WAC data in current schema.
- **Claims rejection analysis** -- no claims adjudication data. Would need PBM integration.
- **Patient demographics** -- minimal patient demographic data currently captured (no gender, no insurance ID). Low reporting value until enriched.

---

## Recommended build order

Phase 1 (sprint 1-2): Foundation + highest value reports

Build the shared reporting infrastructure (date range picker, location filter, export engine, chart components) alongside these 8 high-impact reports:

1. **1.1 Prescription volume trend** -- most requested by pharmacy owners
2. **1.3 Payer mix analysis** -- critical for business decisions
3. **4.1 Hours worked summary** -- needed every pay period
4. **4.2 Overtime analysis** -- direct cost impact
5. **4.6 Payroll summary** -- needed every pay period
6. **7.1 Audit trail report** -- compliance requirement
7. **2.2 Prescriber volume ranking** -- quick win, simple query
8. **3.1 Rep visit activity log** -- quick win, simple query

Phase 2 (sprint 3-4): Clinical and operational

9. **1.2 Top drugs dispensed**
10. **1.4 Generic dispensing rate**
11. **1.5 Refill compliance tracker**
12. **6.1 Fill-to-pickup time**
13. **6.2 Prescription workflow funnel**
14. **6.3 Patient notification delivery**
15. **2.4 New and dormant provider alerts**

Phase 3 (sprint 5-6): Advanced analytics

16. **2.1 Provider scorecard**
17. **2.3 Prescriber trend analysis**
18. **3.2 Rep visit frequency by company**
19. **3.3 Visit-to-prescription correlation**
20. **4.3 Schedule vs actual variance**
21. **4.4 Attendance and punctuality**

Phase 4 (sprint 7): Financial and remaining

22. **5.1 Revenue proxy**
23. **5.2 Labor cost summary**
24. **5.3 Rx per labor hour**
25. **5.4 Payroll export history**
26. **4.5 PTO usage report**
27. **7.2 Controlled substance dispensing log**
28. **3.4 Sample inventory tracker** (inbound only for v1)

---

## Shared infrastructure requirements

All reports share these components -- build once in phase 1:

| Component | Description |
|-----------|-------------|
| **Date range picker** | Presets: today, this week, this month, this quarter, this year, last 30/60/90 days, custom range |
| **Location filter** | Multi-select for orgs with multiple locations. Default: all locations. |
| **Export engine** | CSV export (all reports) + PDF export (formatted with charts). Use server-side generation. |
| **Chart library** | Recharts (already common in Next.js ecosystem). Bar, line, donut, funnel, gauge, histogram. |
| **Report caching** | Cache expensive aggregation queries. Invalidate on new data writes. Consider materialized views for high-volume reports (1.1, 4.1). |
| **Role-based access** | Owner sees all. Pharmacist sees clinical + operational. Technician sees only own time data (4.1, 4.5 filtered to self). Uses existing Permission model with REPORTS module. |
| **Empty states** | Every report must handle zero data gracefully with guidance ("Upload prescription data to see this report"). |
| **Loading states** | Skeleton loaders for all chart and table components. |
| **Org scoping** | Every query MUST filter by organizationId. Non-negotiable for multi-tenancy. |

---

## Technical notes for architect

1. **Query performance** -- PrescriptionRecord will be the largest table. Indexes already exist on `(organizationId, fillDate)`, `(organizationId, drugName, fillDate)`, and `(organizationId, providerId, fillDate)`. These cover the most common report queries. Consider adding `(organizationId, payerType, fillDate)` for payer mix.
2. **JSON field queries** -- DrugRepVisit.drugsPromoted and samplesLeft are JSON arrays. Postgres JSONB operators needed for report 3.3 (visit-to-prescription correlation). Consider extracting promoted drugs into a junction table if query performance suffers.
3. **Schedule time parsing** -- ScheduleEntry stores times as strings ("9:00 AM"). Reports 4.3 and 4.4 need to parse these for comparison with TimeEntry timestamps. Consider a utility function for this, or migrate to proper time fields in a future schema update.
4. **Materialized views** -- For reports hitting PrescriptionRecord with large date ranges, consider Postgres materialized views refreshed on a schedule (e.g., daily rollups of Rx counts by drug/provider/payer/location).
5. **API design** -- Each report should be a single API endpoint returning both chart data and table data. Pattern: `GET /api/reports/{report-slug}?dateFrom=&dateTo=&locationId=&...`
6. **PDF generation** -- Use @react-pdf/renderer or Puppeteer for server-side PDF. Include org branding (logoUrl, brandColor from Organization).

---

HANDOFF TO ARCHITECT: RxDesk Reporting Suite -- brief at `/Users/mohammedzafer/Documents/claude/projects/rxdesk/docs/reports-design.md`
