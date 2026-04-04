# Seed data reference

Seeded via `npm run db:seed`. All passwords: **password123**

---

## Organization

| Field | Value |
|-------|-------|
| Name | Valley Health Pharmacy |
| Plan | GROWTH |
| Timezone | America/New_York |
| Trial | 14 days from seed date |

---

## Locations

| Name | Address | City | State | Zip | NPI |
|------|---------|------|-------|-----|-----|
| Main Street | 123 Main St | Albany | NY | 12207 | 1234567890 |
| Westside | 456 Oak Ave | Albany | NY | 12205 | 0987654321 |

---

## Users

| Email | Name | Role | Location | Password |
|-------|------|------|----------|----------|
| sarah@valleyhealth.com | Sarah Chen | OWNER | Main Street | password123 |
| diego@valleyhealth.com | Diego Martinez | PHARMACIST | Main Street | password123 |
| priya@valleyhealth.com | Priya Patel | PHARMACIST | Westside | password123 |
| marcus@valleyhealth.com | Marcus Johnson | TECHNICIAN | Main Street | password123 |
| mei@valleyhealth.com | Mei Lin | TECHNICIAN | Westside | password123 |
| james@valleyhealth.com | James Wilson | TECHNICIAN | Main Street | password123 |

---

## Providers (doctors)

| Name | NPI | Specialty | Practice | Tags |
|------|-----|-----------|----------|------|
| Dr. Robert Anderson | 1111111111 | Internal Medicine | Albany Medical Group | high-value |
| Dr. Lisa Chang | 2222222222 | Family Medicine | Capital Family Practice | high-value |
| Dr. Michael Torres | 3333333333 | Cardiology | Heart Care Associates | high-value |
| Dr. Jennifer White | 4444444444 | Endocrinology | Albany Endocrine Center | — |
| Dr. David Kim | 5555555555 | Psychiatry | MindWell Clinic | — |
| Dr. Rachel Green | 6666666666 | Orthopedics | Albany Bone & Joint | — |
| Dr. William Brown | 7777777777 | Pulmonology | Lung Care Associates | declining |
| Dr. Sarah Davis | 8888888888 | Dermatology | Clear Skin Dermatology | — |
| Dr. James Miller | 9999999999 | Gastroenterology | GI Associates | — |
| Dr. Emily Watson | 1010101010 | OB/GYN | Women's Health Albany | new |

---

## Prescription records (~400 total)

| Provider | Approx Rx count | Drug pool | Pattern |
|----------|----------------|-----------|---------|
| Anderson | ~80 | Lisinopril, Metformin, Atorvastatin, Lipitor | Steady high volume |
| Chang | ~70 | Lisinopril, Metformin, Amlodipine, Omeprazole | Steady high volume |
| Torres | ~60 | Eliquis, Xarelto, Entresto, Amlodipine | Cardiology focused |
| White | ~50 | Metformin, Jardiance, Ozempic, Levothyroxine | Endocrine focused |
| Kim | ~40 | Sertraline, Levothyroxine | Psychiatry focused |
| Green | ~30 | Amlodipine, Lisinopril, Omeprazole | General |
| Brown | ~25 | Lisinopril, Amlodipine, Omeprazole | **Declining** — most Rx 3-6 months ago, few recent |
| Davis | ~20 | Omeprazole, Levothyroxine | Low volume |
| Miller | ~15 | Omeprazole, Metformin | Low volume |
| Watson | ~10 | Levothyroxine, Metformin | **New** — all in last 30 days |

**Payer mix:** ~50% Commercial, ~25% Medicare, ~15% Medicaid, ~10% Cash

**Date range:** 6 months back from seed date

---

## Drug reps

| Name | Company | Email | Territory |
|------|---------|-------|-----------|
| John Harper | Pfizer | john.harper@pfizer.example.com | Northeast |
| Maria Santos | Merck | maria.santos@merck.example.com | Capital Region |
| Tom Bradley | AstraZeneca | tom.bradley@astrazeneca.example.com | Upstate NY |
| Amy Liu | Novo Nordisk | amy.liu@novonordisk.example.com | Northeast |

---

## Drug rep visits (8)

| When | Rep | Company | Drugs promoted | Providers discussed |
|------|-----|---------|---------------|-------------------|
| ~3 months ago | Harper | Pfizer | Eliquis | Anderson, Torres |
| ~2.5 months ago | Santos | Merck | Jardiance | White |
| ~2 months ago | Bradley | AstraZeneca | Entresto | Torres |
| ~6 weeks ago | Liu | Novo Nordisk | Ozempic | White, Chang |
| ~5 weeks ago | Harper | Pfizer | Lipitor | Anderson (samples left) |
| ~3 weeks ago | Santos | Merck | Jardiance | Chang, Kim |
| ~2 weeks ago | Bradley | AstraZeneca | Xarelto | Torres, Anderson |
| ~1 week ago | Liu | Novo Nordisk | Ozempic | White (samples left) |
