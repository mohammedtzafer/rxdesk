# RxDesk product notes — 04/04/2026

## 1. Drug Rep — conceptual correction

**The Drug Rep in RxDesk is NOT a pharmaceutical company rep visiting the pharmacy.**

They are a **field rep hired by the pharmacy** who visits doctors' offices and provider groups to:
- Build relationships
- Provide lunch/meals
- Steer prescription referrals back to the pharmacy

### Drug Rep role
- Compensation: per-visit pay (not hourly)
- Single-screen experience — logs in and sees only one page

### Drug Rep dashboard — visit log interface
- Calendar view for date-based logging
- "Log Visit" button with form:
  - Provider search (typeahead by name or NPI)
  - Multi-provider selection (multiple doctors in same practice)
  - Save providers for future visits
  - Date + time range (e.g. 10am-12pm)
  - Lunch toggle (yes/no)
  - Notes with placeholder: "Drug Rep visited [Provider Office], spoke with [Doctor(s)], discussed [specific drugs], and additional notes..."

## 2. Remove Prescriptions menu/pages

The Prescriptions module/navigation should be removed entirely from the sidebar. Backend data and APIs remain for analytics accessed through Provider pages.

## 3. Provider page — CSV upload for Rx data

CSV import available on:
- Individual Provider page
- Provider → Analyze Trends page

CSV columns:
- Provider name
- NPI number
- Date of Origin (when Rx was sent to pharmacy)
- Date of Fill (when it was filled)
- Drug name
- NDC (National Drug Code)
- Brand Name vs Generic flag

Purpose: tie Rx fill data to providers for referral trend analysis.

### Date filter update
Replace existing filters with: 7 Days, 14 Days, 30 Days, 60 Days, 90 Days, Custom Date Range

## 4. Dark mode / light mode toggle

Add toggle in top navigation bar, consistent with standard SaaS patterns.
