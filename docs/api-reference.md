# RxDesk API reference

Base URL: `/api`

All authenticated endpoints require a valid session cookie (Auth.js). Responses use JSON unless noted. Every error follows `{ error: string }`.

---

## 1. Auth

### POST /api/auth/register

Create a new user account. No auth required.

**Rate limit:** 10 requests/minute per IP.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | Yes | Min 1 character |
| email | string | Yes | Valid email |
| password | string | Yes | Min 8 characters |

**Response 200:**
```json
{ "success": true, "requiresVerification": true }
```

**Errors:** 400 (validation), 409 (email exists), 429 (rate limit)

---

### POST /api/auth/verify

Verify a user's email address. No auth required.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| token | string | Yes | Token from verification email |

**Response 200:**
```json
{ "success": true, "email": "user@example.com" }
```

**Errors:** 400 (missing/invalid/expired token)

---

### POST /api/auth/forgot-password

Request a password reset email. No auth required. Always returns success to prevent email enumeration.

**Rate limit:** 5 requests/minute per IP.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| email | string | Yes | Valid email |

**Response 200:**
```json
{ "success": true }
```

---

### POST /api/auth/reset-password

Reset password using a token from the reset email. No auth required.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| token | string | Yes | Reset token |
| password | string | Yes | Min 8 characters |

**Response 200:**
```json
{ "success": true }
```

**Errors:** 400 (invalid/expired token, validation)

---

### POST /api/auth/setup-org

Create an organization and first location after registration. Auth required (session).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| pharmacyName | string | Yes | Min 1 character |
| timezone | string | Yes | IANA timezone |
| locationName | string | Yes | Min 1 character |
| locationAddress | string | No | |
| locationCity | string | No | |
| locationState | string | No | |
| locationZip | string | No | |
| locationPhone | string | No | |
| locationNpi | string | No | |

**Response 200:**
```json
{
  "success": true,
  "organizationId": "clx...",
  "locationId": "clx..."
}
```

Creates a 14-day trial, sets user role to OWNER, assigns default permissions, writes audit log.

---

### GET/POST /api/auth/[...nextauth]

Auth.js handler. Handles OAuth and credential sign-in flows. Do not call directly.

---

## 2. Providers

### GET /api/providers

List providers in the organization. Paginated.

**Auth:** Session required. Permission: `PROVIDERS:VIEW`.

| Query param | Type | Default | Notes |
|-------------|------|---------|-------|
| page | number | 1 | |
| limit | number | 50 | Max 100 |
| search | string | | Searches firstName, lastName, npi, practiceName |
| specialty | string | | Filter by specialty (case-insensitive contains) |

**Response 200:**
```json
{
  "providers": [
    {
      "id": "clx...",
      "npi": "1234567890",
      "firstName": "Jane",
      "lastName": "Smith",
      "suffix": "MD",
      "credential": "MD",
      "specialty": "Internal Medicine",
      "practiceName": "Smith Medical",
      "practiceCity": "Austin",
      "practiceState": "TX",
      "tags": ["high-volume"],
      "isActive": true,
      "_count": { "prescriptionRecords": 142 }
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

---

### POST /api/providers

Create a provider. Starter plan limit: 50 providers.

**Auth:** Session required. Permission: `PROVIDERS:EDIT`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| npi | string | Yes | 1-10 chars |
| firstName | string | Yes | |
| lastName | string | Yes | |
| suffix | string | No | |
| credential | string | No | |
| specialty | string | No | |
| practiceName | string | No | |
| practiceAddress | string | No | |
| practiceCity | string | No | |
| practiceState | string | No | |
| practiceZip | string | No | |
| practicePhone | string | No | |
| tags | string[] | No | |
| notes | string | No | |
| enrichedFromNppes | boolean | No | |

**Response 201:** Full provider object.

**Errors:** 400 (validation), 403 (plan limit), 409 (duplicate NPI in org)

---

### GET /api/providers/:id

Get a single provider by ID.

**Auth:** Session required. Permission: `PROVIDERS:VIEW`.

**Response 200:** Full provider object including `_count.prescriptionRecords`, `createdAt`, `enrichedFromNppes`, `lastEnrichedAt`.

**Errors:** 404 (not found)

---

### PUT /api/providers/:id

Update a provider. All fields optional.

**Auth:** Session required. Permission: `PROVIDERS:EDIT`.

Accepts any subset of: `firstName`, `lastName`, `suffix`, `credential`, `specialty`, `practiceName`, `practiceAddress`, `practiceCity`, `practiceState`, `practiceZip`, `practicePhone`, `tags`, `notes`, `isActive`.

**Response 200:** Updated provider object.

---

### DELETE /api/providers/:id

Soft-delete a provider (sets `isActive: false`).

**Auth:** Session required. Permission: `PROVIDERS:FULL`.

**Response 200:**
```json
{ "success": true }
```

---

### GET /api/providers/search-nppes

Search the NPPES registry for providers.

**Auth:** Session required. Permission: `PROVIDERS:EDIT`.

| Query param | Type | Required | Notes |
|-------------|------|----------|-------|
| npi | string | No* | |
| firstName | string | No* | |
| lastName | string | No* | |
| state | string | No | |
| city | string | No | |
| specialty | string | No | |

*At least one of `npi`, `firstName`, or `lastName` is required.

**Response 200:**
```json
{ "results": [ { ...nppes provider data } ] }
```

**Errors:** 400 (missing required params), 502 (NPPES API failure)

---

### GET /api/providers/:id/analytics

Get prescription analytics for a specific provider.

**Auth:** Session required. Permission: `PROVIDERS:VIEW`.

| Query param | Type | Default | Notes |
|-------------|------|---------|-------|
| days | number | 90 | Analysis window in days |

**Response 200:** Analytics object from `calculateProviderAnalytics()` comparing current and prior period prescription records by drug, payer type, generic ratio, etc.

**Errors:** 404 (provider not found)

---

## 3. Prescriptions

### POST /api/prescriptions/upload

Upload a CSV file of prescription records. Starter plan limit: 1 upload/month.

**Auth:** Session required. Permission: `PRESCRIPTIONS:EDIT`.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| file | File | Yes | Must be .csv |
| locationId | string | No | Location to associate records with |

**Response 200:**
```json
{
  "uploadId": "clx...",
  "status": "COMPLETED",
  "rowCount": 1500,
  "errors": [{ "row": 5, "message": "Invalid date format" }],
  "dateRangeStart": "2024-01-01",
  "dateRangeEnd": "2024-03-31"
}
```

Records are inserted in batches of 500. Provider NPI matching is automatic against existing providers. Only the first 20 parsing errors are returned.

---

### GET /api/prescriptions/uploads

List prescription upload history (last 50).

**Auth:** Session required. Permission: `PRESCRIPTIONS:VIEW`.

**Response 200:**
```json
[
  {
    "id": "clx...",
    "fileName": "march-2024.csv",
    "rowCount": 1500,
    "dateRangeStart": "2024-01-01",
    "dateRangeEnd": "2024-03-31",
    "status": "COMPLETED",
    "errorMessage": null,
    "createdAt": "2024-04-01T..."
  }
]
```

---

### GET /api/prescriptions/dashboard

Get prescription analytics dashboard data.

**Auth:** Session required. Permission: `PRESCRIPTIONS:VIEW`.

| Query param | Type | Default | Notes |
|-------------|------|---------|-------|
| days | number | 90 | Analysis window |
| locationId | string | | Filter by location |

**Response 200:**
```json
{
  "totalRx": 5000,
  "priorTotalRx": 4200,
  "trend": { "direction": "up", "percent": 19.05 },
  "topPrescribers": [
    { "npi": "1234567890", "name": "Jane Smith", "count": 142 }
  ],
  "concentrationRisk": { "hhi": 0.15, "level": "moderate", "topProviderShare": 0.35 },
  "activeProviders": 25,
  "days": 90
}
```

---

### GET /api/prescriptions/alerts

Get prescriber alerts (new and dormant prescribers).

**Auth:** Session required. Permission: `PRESCRIPTIONS:VIEW`.

**Response 200:**
```json
{
  "newPrescribers": [
    { "npi": "1234567890", "name": "Jane Smith", "specialty": "Internal Medicine" }
  ],
  "dormantPrescribers": [
    { "npi": "0987654321", "name": "John Doe", "specialty": "Cardiology" }
  ],
  "newPrescriberNpis": ["5555555555"]
}
```

New = NPIs seen in last 30 days but not before. Dormant = NPIs seen 30-60 days ago but not in the last 30. `newPrescriberNpis` lists unmatched NPIs (no provider record).

---

## 4. Drug reps

### GET /api/drug-reps

List drug reps.

**Auth:** Session required. Permission: `DRUG_REPS:VIEW`.

| Query param | Type | Notes |
|-------------|------|-------|
| search | string | Searches firstName, lastName, company |
| company | string | Filter by company |

**Response 200:**
```json
[
  {
    "id": "clx...",
    "firstName": "Mike",
    "lastName": "Johnson",
    "company": "Pfizer",
    "email": "mike@pfizer.com",
    "phone": "555-1234",
    "territory": "Southeast",
    "_count": { "visits": 12 }
  }
]
```

---

### POST /api/drug-reps

Create a drug rep.

**Auth:** Session required. Permission: `DRUG_REPS:EDIT`.

| Field | Type | Required |
|-------|------|----------|
| firstName | string | Yes |
| lastName | string | Yes |
| company | string | Yes |
| email | string | No |
| phone | string | No |
| territory | string | No |
| notes | string | No |

**Response 201:** Drug rep object.

---

### GET /api/drug-reps/:id

Get a drug rep with their last 20 visits.

**Auth:** Session required. Permission: `DRUG_REPS:VIEW`.

**Response 200:** Drug rep object with `visits[]` including linked providers.

**Errors:** 404 (not found)

---

### PUT /api/drug-reps/:id

Update a drug rep. All fields optional.

**Auth:** Session required. Permission: `DRUG_REPS:EDIT`.

**Response 200:** Updated drug rep object.

---

### DELETE /api/drug-reps/:id

Permanently delete a drug rep.

**Auth:** Session required. Permission: `DRUG_REPS:FULL`.

**Response 200:**
```json
{ "success": true }
```

---

### GET /api/drug-reps/visits

List drug rep visits. Paginated.

**Auth:** Session required. Permission: `DRUG_REPS:VIEW`.

| Query param | Type | Default |
|-------------|------|---------|
| page | number | 1 |
| limit | number | 25 (max 100) |
| drugRepId | string | Filter by rep |

**Response 200:**
```json
{
  "visits": [
    {
      "id": "clx...",
      "visitDate": "2024-03-15T...",
      "durationMinutes": 30,
      "drugsPromoted": [{ "name": "Lipitor", "ndc": "1234" }],
      "samplesLeft": [{ "name": "Lipitor", "quantity": 50 }],
      "notes": "Discussed formulary changes",
      "followUpDate": "2024-04-15T...",
      "drugRep": { "id": "clx...", "firstName": "Mike", "lastName": "Johnson", "company": "Pfizer" },
      "providers": [{ "provider": { "id": "clx...", "firstName": "Jane", "lastName": "Smith", "npi": "1234567890" } }]
    }
  ],
  "total": 50,
  "page": 1,
  "totalPages": 2
}
```

---

### POST /api/drug-reps/visits

Log a visit. Starter plan limit: 10 visits/month.

**Auth:** Session required. Permission: `DRUG_REPS:EDIT`.

| Field | Type | Required |
|-------|------|----------|
| drugRepId | string | Yes |
| visitDate | string | Yes (ISO date) |
| locationId | string | No |
| durationMinutes | number | No |
| providerIds | string[] | No |
| drugsPromoted | `{ name, ndc?, notes? }[]` | No |
| samplesLeft | `{ name, quantity?, lot?, expiration? }[]` | No |
| notes | string | No |
| followUpDate | string | No (ISO date) |

**Response 201:** Visit object.

---

### GET /api/drug-reps/correlations

Analyze correlations between drug rep visits and prescription patterns.

**Auth:** Session required. Permission: `DRUG_REPS:VIEW`.

| Query param | Type | Default |
|-------------|------|---------|
| providerId | string | All providers |
| days | number | 180 |

**Response 200:**
```json
{
  "correlations": [
    {
      "visitId": "clx...",
      "visitDate": "2024-01-15",
      "drugPromoted": "Lipitor",
      "rxCountBefore": 5,
      "rxCountAfter": 12,
      "change": "+140%"
    }
  ],
  "visits": [...]
}
```

---

## 5. Time tracking

### GET /api/time-entries

List time entries.

**Auth:** Session required. Permission: `TIME_TRACKING:VIEW`.

| Query param | Type | Notes |
|-------------|------|-------|
| startDate | string | ISO date |
| endDate | string | ISO date |
| userId | string | Defaults to current user |

**Response 200:**
```json
[
  {
    "id": "clx...",
    "date": "2024-03-15T...",
    "startTime": "2024-03-15T09:00:00Z",
    "endTime": "2024-03-15T17:00:00Z",
    "durationMinutes": 480,
    "regularHours": 8,
    "overtimeHours": 0,
    "breakMinutes": 30,
    "breakType": null,
    "note": "Regular shift",
    "isClockIn": false
  }
]
```

---

### POST /api/time-entries

Create a manual time entry.

**Auth:** Session required. Permission: `TIME_TRACKING:EDIT`.

| Field | Type | Required |
|-------|------|----------|
| date | string | Yes (ISO date) |
| startTime | string | Yes (ISO datetime) |
| endTime | string | No |
| note | string | No |
| breakMinutes | number | No (min 0) |
| locationId | string | No (defaults to user's location) |

**Response 201:** Time entry object.

---

### POST /api/time-entries/clock

Toggle clock in/out. If there's an open clock-in entry, this clocks out. Otherwise, clocks in.

**Auth:** Session required. Permission: `TIME_TRACKING:EDIT`.

**Request body:** None.

**Response 200:**
```json
{
  "action": "clock_in",
  "entry": { ...time entry }
}
```

or

```json
{
  "action": "clock_out",
  "entry": { ...updated time entry with endTime and duration }
}
```

---

### GET /api/pto

List PTO requests. Technicians see only their own.

**Auth:** Session required. Permission: `TIME_TRACKING:VIEW`.

| Query param | Type | Notes |
|-------------|------|-------|
| status | string | PENDING, APPROVED, DENIED |
| employeeId | string | Filter by employee |

**Response 200:**
```json
[
  {
    "id": "clx...",
    "employeeId": "clx...",
    "startDate": "2024-04-01",
    "endDate": "2024-04-05",
    "type": "VACATION",
    "note": "Family trip",
    "status": "PENDING",
    "responseNote": null,
    "submittedAt": "2024-03-15T...",
    "reviewedAt": null
  }
]
```

---

### POST /api/pto

Submit a PTO request. Notifies managers.

**Auth:** Session required. Permission: `TIME_TRACKING:EDIT`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| startDate | string | Yes | ISO date |
| endDate | string | Yes | ISO date |
| type | enum | Yes | VACATION, SICK, PERSONAL, OTHER |
| note | string | No | |

**Response 201:** PTO request object.

---

### POST /api/pto/:id

Approve or deny a PTO request. Notifies the employee.

**Auth:** Session required. Permission: `TIME_TRACKING:FULL`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| action | enum | Yes | "approve" or "deny" |
| responseNote | string | No | |

**Response 200:**
```json
{ "success": true, "status": "APPROVED" }
```

**Errors:** 400 (already reviewed), 404 (not found)

---

## 6. Schedules

### GET /api/schedules

List weekly schedules (last 20).

**Auth:** Session required. Permission: `TIME_TRACKING:VIEW`.

| Query param | Type | Notes |
|-------------|------|-------|
| locationId | string | Filter by location |
| weekStart | string | Filter by week |

**Response 200:** Array of schedule objects with `entries[]` and `comments[]`.

---

### POST /api/schedules

Create or update a weekly schedule. Sends notifications when a schedule is finalized or updated after finalization.

**Auth:** Session required. Permission: `TIME_TRACKING:EDIT`.

| Field | Type | Required |
|-------|------|----------|
| locationId | string | Yes |
| weekStart | string | Yes (ISO date, Monday) |
| status | enum | Yes ("Not Started", "In Progress", "Finalized") |
| entries | array | Yes |
| comment | string | No |

Each entry:
| Field | Type | Required |
|-------|------|----------|
| employeeId | string | Yes |
| employeeName | string | Yes |
| day | string | Yes |
| available | boolean | Yes |
| startTime | string | Yes |
| endTime | string | Yes |
| role | string | Yes |

**Response 200:** Schedule object with entries and comments.

---

## 7. Employees

### GET /api/employees

List employees with their availability preferences for scheduling.

**Auth:** Session required. Permission: `TIME_TRACKING:VIEW`.

| Query param | Type | Notes |
|-------------|------|-------|
| locationId | string | Filter by location |

**Response 200:**
```json
[
  {
    "id": "clx...",
    "name": "Jane Smith",
    "targetHoursPerWeek": 40,
    "sortOrder": 0,
    "locationId": "clx...",
    "availability": {
      "Monday": { "available": true, "startTime": "9:00 AM", "endTime": "5:00 PM", "role": "Filling" },
      "Tuesday": { ... }
    }
  }
]
```

---

### PUT /api/employees

Update an employee's availability and target hours.

**Auth:** Session required. Permission: `TIME_TRACKING:EDIT`.

| Field | Type | Required |
|-------|------|----------|
| userId | string | Yes |
| targetHoursPerWeek | number | No (0-80) |
| availability | `Record<day, { available, startTime, endTime, role }>` | No |

**Response 200:**
```json
{ "success": true }
```

---

### PUT /api/employees/reorder

Reorder employees in the schedule view.

**Auth:** Session required. Permission: `TIME_TRACKING:EDIT`.

| Field | Type | Required |
|-------|------|----------|
| userIds | string[] | Yes (ordered array of user IDs) |

**Response 200:**
```json
{ "success": true }
```

---

## 8. Team

### GET /api/team

List all team members and pending invites.

**Auth:** Session required. No specific module permission (uses org membership).

**Response 200:**
```json
{
  "users": [
    {
      "id": "clx...",
      "name": "Jane Smith",
      "email": "jane@pharmacy.com",
      "role": "OWNER",
      "active": true,
      "lastActiveAt": "2024-03-15T...",
      "locationId": "clx...",
      "location": { "id": "clx...", "name": "Main St" },
      "locations": [{ "isPrimary": true, "location": { "id": "clx...", "name": "Main St" } }],
      "permissions": [{ "module": "PROVIDERS", "access": "FULL" }]
    }
  ],
  "invites": [
    {
      "id": "clx...",
      "email": "new@pharmacy.com",
      "role": "TECHNICIAN",
      "status": "PENDING",
      "expiresAt": "2024-03-22T...",
      "createdAt": "2024-03-15T..."
    }
  ]
}
```

---

### POST /api/team

Send a team invite. Enforces plan-based user limits (Starter: 3, Growth: 15, Pro: 999).

**Auth:** Session required. Permission: `TEAM:EDIT`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| email | string | Yes | Valid email |
| role | enum | Yes | PHARMACIST or TECHNICIAN |
| locationId | string | No | |

**Response 201:** Invite object. Sends invite email.

**Errors:** 403 (plan limit), 409 (user exists / invite pending)

---

### PUT /api/team/:id

Update a team member's role, location, or active status. Cannot modify the OWNER.

**Auth:** Session required. Permission: `TEAM:EDIT`.

| Field | Type | Required |
|-------|------|----------|
| role | enum | No (PHARMACIST or TECHNICIAN) |
| locationId | string | No (nullable) |
| active | boolean | No |
| locationIds | string[] | No (multi-location assignment, first = primary) |

**Response 200:** Updated user object.

**Errors:** 403 (cannot modify owner), 404 (not found)

---

### GET /api/team/:id/locations

Get a team member's assigned locations.

**Auth:** Session required.

**Response 200:**
```json
[
  {
    "locationId": "clx...",
    "isPrimary": true,
    "location": { "id": "clx...", "name": "Main St" }
  }
]
```

---

### PUT /api/team/:id/locations

Update a team member's location assignments.

**Auth:** Session required. Permission: `TEAM:EDIT`.

| Field | Type | Required |
|-------|------|----------|
| locationIds | string[] | Yes (min 1) |
| primaryLocationId | string | Yes (must be in locationIds) |

**Response 200:**
```json
{ "success": true }
```

---

### GET /api/permissions/:userId

Get a user's module permissions.

**Auth:** Session required.

**Response 200:**
```json
[
  { "module": "PROVIDERS", "access": "FULL" },
  { "module": "PRESCRIPTIONS", "access": "VIEW" }
]
```

---

### PUT /api/permissions/:userId

Update a user's permissions. Cannot modify OWNER.

**Auth:** Session required. Permission: `TEAM:FULL`.

| Field | Type | Required |
|-------|------|----------|
| permissions | array | Yes |

Each permission:
| Field | Type | Values |
|-------|------|--------|
| module | enum | PROVIDERS, PRESCRIPTIONS, DRUG_REPS, TIME_TRACKING, TEAM, REPORTS, SETTINGS |
| access | enum | NONE, VIEW, EDIT, FULL |

**Response 200:**
```json
{ "success": true }
```

**Errors:** 403 (cannot modify owner), 404 (user not found)

---

## 9. Locations

### GET /api/locations

List all locations in the organization.

**Auth:** Session required.

**Response 200:**
```json
[
  {
    "id": "clx...",
    "name": "Main Street Pharmacy",
    "address": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zip": "78701",
    "phone": "512-555-1234",
    "npiNumber": "1234567890",
    "licenseNumber": "PH-12345",
    "isActive": true,
    "_count": { "users": 5 }
  }
]
```

---

### POST /api/locations

Create a location. Plan limits: Starter 1, Growth 3, Pro unlimited.

**Auth:** Session required. Permission: `SETTINGS:EDIT`.

| Field | Type | Required |
|-------|------|----------|
| name | string | Yes |
| address | string | No |
| city | string | No |
| state | string | No |
| zip | string | No |
| phone | string | No |
| npiNumber | string | No |
| licenseNumber | string | No |

**Response 201:** Location object.

**Errors:** 403 (plan limit)

---

### PUT /api/locations/:id

Update a location. All fields optional.

**Auth:** Session required. Permission: `SETTINGS:EDIT`.

Accepts: `name`, `address`, `city`, `state`, `zip`, `phone`, `npiNumber`, `licenseNumber`, `isActive`.

**Response 200:** Updated location object.

---

### PUT /api/locations/:id/roles

Update the available scheduling roles for a location.

**Auth:** Session required. Permission: `SETTINGS:EDIT`.

| Field | Type | Required |
|-------|------|----------|
| roles | string[] | Yes (min 1 per entry) |

**Response 200:** Updated location object.

---

## 10. Settings

### GET /api/settings

Get organization settings.

**Auth:** Session required.

**Response 200:**
```json
{
  "id": "clx...",
  "name": "Main Street Pharmacy",
  "timezone": "America/New_York",
  "plan": "GROWTH",
  "trialEndsAt": "2024-03-29T...",
  "brandColor": "#0071e3",
  "logoUrl": null,
  "brandName": "RxDesk",
  "createdAt": "2024-03-15T..."
}
```

---

### PUT /api/settings

Update organization settings.

**Auth:** Session required. Permission: `SETTINGS:EDIT`.

| Field | Type | Required |
|-------|------|----------|
| name | string | No |
| timezone | string | No |
| brandColor | string | No (nullable) |
| logoUrl | string | No (nullable, must be valid URL) |
| brandName | string | No (nullable) |

**Response 200:** Updated organization object.

---

## 11. Notifications

### GET /api/notifications

Get notifications for the current user.

**Auth:** Session required.

| Query param | Type | Default | Notes |
|-------------|------|---------|-------|
| unread | "true" | | Only unread notifications |
| limit | number | 50 | Max 100 |

**Response 200:**
```json
{
  "notifications": [
    {
      "id": "clx...",
      "type": "PTO_SUBMITTED",
      "title": "PTO Request",
      "message": "Jane Smith requested PTO for Mar 20 - Mar 24, 2024",
      "entityType": "ptoRequest",
      "entityId": "clx...",
      "read": false,
      "createdAt": "2024-03-15T..."
    }
  ],
  "unreadCount": 3
}
```

---

### POST /api/notifications/read

Mark notifications as read.

**Auth:** Session required.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| notificationIds | string[] | No | Mark specific notifications |
| markAllRead | boolean | No | Mark all as read |

**Response 200:**
```json
{ "success": true }
```

---

## 12. Audit log

### GET /api/audit-log

Get audit log entries. Paginated.

**Auth:** Session required. Permission: `SETTINGS:VIEW`.

| Query param | Type | Default |
|-------------|------|---------|
| page | number | 1 |
| limit | number | 50 (max 100) |
| entityType | string | Filter by entity type |
| action | string | Filter by action |

**Response 200:**
```json
{
  "logs": [
    {
      "id": "clx...",
      "action": "provider.created",
      "entityType": "provider",
      "entityId": "clx...",
      "metadata": { "npi": "1234567890", "name": "Jane Smith" },
      "createdAt": "2024-03-15T...",
      "user": { "id": "clx...", "name": "Admin User", "email": "admin@pharmacy.com" }
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 2
}
```

---

## 13. Payroll

### POST /api/payroll/export

Generate and download a payroll CSV export.

**Auth:** Session required. Permission: `REPORTS:VIEW`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| format | enum | Yes | ADP, PAYCHEX, GUSTO, CSV, GENERIC |
| periodStart | string | Yes | ISO date |
| periodEnd | string | Yes | ISO date |
| locationId | string | No | |
| companyCode | string | No | For ADP exports |

**Response:** CSV file download with `Content-Disposition: attachment`.

Records the export in `payrollExport` table.

---

### GET /api/payroll/exports

List payroll export history (last 50).

**Auth:** Session required. Permission: `REPORTS:VIEW`.

**Response 200:**
```json
[
  {
    "id": "clx...",
    "format": "ADP",
    "periodStart": "2024-03-01",
    "periodEnd": "2024-03-15",
    "totalEmployees": 8,
    "totalHours": 640,
    "totalOvertimeHours": 12.5,
    "fileName": "payroll-adp-2024-03-01-to-2024-03-15.csv",
    "status": "COMPLETED",
    "createdAt": "2024-03-16T..."
  }
]
```

---

## 14. Integrations

### GET /api/integrations/connections

List PMS connections.

**Auth:** Session required. Permission: `SETTINGS:VIEW`.

**Response 200:**
```json
[
  {
    "id": "clx...",
    "locationId": "clx...",
    "pmsType": "PIONEER_RX",
    "name": "Main St PioneerRx",
    "isActive": true,
    "lastSyncAt": "2024-03-15T...",
    "syncStatus": "Processed 50 events",
    "createdAt": "2024-01-01T...",
    "location": { "name": "Main Street Pharmacy" }
  }
]
```

---

### POST /api/integrations/connections

Create a new PMS connection. Generates a webhook secret automatically.

**Auth:** Session required. Permission: `SETTINGS:FULL`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| locationId | string | Yes | |
| pmsType | enum | Yes | PIONEER_RX, LIBERTY, PRIME_RX, QS1, RX30, COMPUTER_RX, BEST_RX, DATASCAN, CSV_IMPORT, OTHER |
| name | string | Yes | |
| apiUrl | string | No | Valid URL |
| apiKey | string | No | |
| apiSecret | string | No | |

**Response 201:**
```json
{
  "id": "clx...",
  "locationId": "clx...",
  "pmsType": "PIONEER_RX",
  "name": "Main St PioneerRx",
  "isActive": true,
  "webhookUrl": "https://app.rxdesk.io/api/integrations/webhook",
  "webhookSecret": "abc123..."
}
```

---

### POST /api/integrations/webhook

Receive prescription events from a PMS. No session auth -- uses HMAC signature verification.

**Headers:**
| Header | Required | Notes |
|--------|----------|-------|
| x-location-id | Yes | Location ID for routing |
| x-webhook-signature | Yes* | HMAC-SHA256 of request body using the connection's webhook secret |

*Required if the connection has a webhook secret configured.

**Request body:** Single event or array of events.

| Field | Type | Notes |
|-------|------|-------|
| patientExternalId | string | Patient ID from PMS |
| patientFirstName | string | |
| patientLastName | string | |
| patientPhone | string | |
| patientEmail | string | |
| eventType | string | Mapped to: RX_NEW, RX_FILLED, RX_READY, RX_PICKED_UP, RX_TRANSFERRED, RX_REFILL_DUE, RX_CANCELLED, RX_ON_HOLD, RX_PARTIAL_FILL, RX_RETURNED |
| drugName | string | |
| drugNdc | string | |
| providerNpi | string | |
| providerName | string | |
| quantity | number | |
| daysSupply | number | |
| fillDate | string | ISO date |
| readyAt | string | ISO datetime |
| payerName | string | |
| copay | number | |

Auto-creates/updates patients. Queues SMS notification when event is RX_READY and patient has opted in.

**Response 200:**
```json
{ "processed": 5 }
```

**Errors:** 400 (missing location header), 401 (invalid signature), 404 (no active connection)

---

### GET /api/integrations/events

List prescription events. Paginated.

**Auth:** Session required. Permission: `PRESCRIPTIONS:VIEW`.

| Query param | Type | Default |
|-------------|------|---------|
| page | number | 1 |
| limit | number | 50 (max 100) |
| eventType | string | Filter by type |
| locationId | string | Filter by location |

**Response 200:**
```json
{
  "events": [
    {
      "id": "clx...",
      "eventType": "RX_READY",
      "drugName": "Lisinopril 10mg",
      "drugNdc": "12345-678-90",
      "providerNpi": "1234567890",
      "providerName": "Dr. Smith",
      "quantity": 30,
      "fillDate": "2024-03-15",
      "readyAt": "2024-03-15T14:30:00Z",
      "pickedUpAt": null,
      "payerName": "Blue Cross",
      "copay": 10.00,
      "source": "PIONEER_RX",
      "createdAt": "2024-03-15T14:30:00Z",
      "patient": {
        "id": "clx...",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "555-0123"
      }
    }
  ],
  "total": 500,
  "page": 1,
  "totalPages": 10
}
```

---

### GET /api/integrations/templates

List notification templates.

**Auth:** Session required.

**Response 200:** Array of notification template objects.

---

### POST /api/integrations/templates

Create a notification template.

**Auth:** Session required. Permission: `SETTINGS:EDIT`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | Yes | |
| channel | enum | Yes | SMS, VOICE, EMAIL |
| eventType | enum | No | RX_NEW, RX_FILLED, RX_READY, RX_PICKED_UP, RX_TRANSFERRED, RX_REFILL_DUE, RX_CANCELLED, RX_ON_HOLD, RX_PARTIAL_FILL, RX_RETURNED |
| subject | string | No | For email templates |
| body | string | Yes | Template body |
| isDefault | boolean | No | |

**Response 201:** Template object.

---

## 15. Drugs

### GET /api/drugs/search

Search the RxNorm database for drugs.

**Auth:** Session required.

| Query param | Type | Required |
|-------------|------|----------|
| q | string | Yes (min 2 chars) |

**Response 200:**
```json
{
  "drugs": [
    { "rxcui": "12345", "name": "Lisinopril 10mg Oral Tablet", "form": "Tablet", "type": "SBD" }
  ],
  "suggestions": []
}
```

When no results are found, `suggestions` may contain spelling corrections:
```json
{
  "drugs": [],
  "suggestions": ["lisinopril", "losartan"]
}
```

**Errors:** 400 (query too short), 502 (RxNorm API failure)

---

### GET /api/drugs/:rxcui

Get detailed drug information by RxCUI. Results are cached for 30 days.

**Auth:** Session required.

**Response 200:**
```json
{
  "rxcui": "12345",
  "name": "Lisinopril 10mg Oral Tablet",
  "brandName": "Prinivil",
  "genericName": "lisinopril",
  "ndc": ["12345-678-90"],
  "dosageForm": "Oral Tablet",
  "route": "Oral",
  "strength": "10 mg",
  "interactions": [
    { "drug": "Potassium Chloride", "severity": "moderate", "description": "..." }
  ]
}
```

**Errors:** 404 (drug not found), 502 (RxNorm API failure)

---

## 16. Patients

### GET /api/patients

List patients. Paginated.

**Auth:** Session required. Permission: `PRESCRIPTIONS:VIEW`.

| Query param | Type | Default |
|-------------|------|---------|
| page | number | 1 |
| limit | number | 50 (max 100) |
| search | string | Searches firstName, lastName, phone |

**Response 200:**
```json
{
  "patients": [
    {
      "id": "clx...",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "555-0123",
      "email": "john@example.com",
      "smsOptIn": true,
      "preferredChannel": "SMS",
      "createdAt": "2024-03-15T...",
      "_count": {
        "prescriptionEvents": 12,
        "patientNotifications": 3
      }
    }
  ],
  "total": 200,
  "page": 1,
  "totalPages": 4
}
```

---

### POST /api/patients

Create a patient manually.

**Auth:** Session required. Permission: `PRESCRIPTIONS:EDIT`.

| Field | Type | Required |
|-------|------|----------|
| firstName | string | Yes |
| lastName | string | Yes |
| dateOfBirth | string | No (ISO date) |
| phone | string | No |
| email | string | No (valid email) |
| smsOptIn | boolean | No (default false) |
| voiceOptIn | boolean | No (default false) |
| emailOptIn | boolean | No (default false) |
| preferredChannel | enum | No (SMS, VOICE, EMAIL -- default SMS) |
| locationId | string | No |

**Response 201:** Patient object.
