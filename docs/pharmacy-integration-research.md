# Pharmacy integration research

*Last updated: 04/04/2026*

---

## 1. Executive summary

The independent pharmacy software ecosystem is fragmented but consolidating. **RedSail Technologies** now dominates with ~16,000 pharmacies after acquiring PrimeRx (02/2026), owning PioneerRx, BestRx, QS/1 NRx, and PrimeRx. **Outcomes** (formerly TDS + Cardinal Health Outcomes) owns Rx30 and Computer-Rx. Together these two groups serve the majority of US independent pharmacies.

**Key findings for RxDesk integration planning:**

- **PioneerRx** is the only PMS with a well-documented REST API (Enterprise API v1.8.3, Rx Event API with 26 webhook event types, POS API, Patient Data Exchange API). This should be the first integration target.
- **Liberty Software** has API key-based integration and growing EHR interop. Second priority.
- Most other systems (Rx30, Computer-Rx, BestRx, NRx, Datascan) rely on **file-based exports** (CSV, HL7, NCPDP flat files) rather than REST APIs.
- **Surescripts** is the backbone for e-prescribing, medication history, and real-time benefits, but requires formal certification and partnership.
- **NCPDP D.0** is the mandatory standard for pharmacy claims. Modern REST wrappers (Starlight API, TransactRx) exist for developers who need JSON access.
- For patient communication, **Twilio** is the clear choice with HIPAA-eligible SMS/voice and BAA support.
- For payroll, **Finch** provides a unified API across 220+ HRIS/payroll systems (ADP, Paychex, Gusto, etc.) for $35/connection/month.
- Drug data is available free via **RxNorm API** and **openFDA**, or commercially via **FDB MedKnowledge** and **Medi-Span**.

---

## 2. PMS integration landscape

### 2.1 PioneerRx (RedSail Technologies)

**Market position:** Highest market share and satisfaction among independent pharmacies. ~16,000+ pharmacies under RedSail umbrella.

**API capabilities (strongest in the market):**

| API | Type | Auth | Data format | Key capabilities |
|-----|------|------|-------------|-----------------|
| Enterprise API v1.8.3 | REST (HTTPS POST) | SHA512 signature (timestamp + shared secret, UTF-16-LE, Base64) | JSON | Patient CRUD, prescriber lookup, employee search, documents, allergies, conditions, AR, pay methods |
| Rx Event API v2 | Webhook (HTTPS POST) | Basic Auth (username/password) | JSON or XML | 26 event types: fill, hold, cancel, transfer, check, inventory, delivery, reversal |
| Patient Data Exchange API | REST | Shared secret hash | JSON | Bidirectional patient data sync, onboarding, updates |
| POS Universal API | REST | Same as Enterprise | JSON | RxQuery (prescription lookup), RxComplete (confirm sale) |
| MTM Actions API | REST or FTP | Shared secret hash | JSON or flat file | MTM action management with status, due dates, completion |

**Enterprise API endpoints:**
- `POST /api/enterprise/method/process` -- main method execution
- `GET /api/enterprise/method/list` -- self-documenting method list
- `POST /api/enterprise/IsAuthenticated` -- auth validation
- `POST /api/enterprise/method/test/process` -- test execution
- `POST /api/enterprise/method/validate` -- parameter validation
- `POST /api/enterprise/method/sample` -- mock data generation

**Enterprise API methods (read-only for external vendors):**
- Patient: `GetPatient`, `SearchPatient`, `GetPatientAddress`, `GetPatientPhone`, `GetPatientAllergy`, `GetPatientCondition`, `GetPatientDocument`, `GetPatientPayMethod`, `GetPatientProfile`, `GetPatientAccountsReceivable`
- Employee: `EmployeeSearch`, `GetEmployee`, `GetEmployeeAddress`, `GetEmployeeRole`
- Prescriber: `PrescriberSearch`, `GetPrescriber`, `GetPrescriberAddress`, `GetPrescriberMedicaidLicenses`

**Rx Event types (26 total):** Inventory removal/return/adjustment, Rx hold/fill/cancel/discontinue/transfer, QC checking/pre-checking, waiting for fill/print/central fill, checked, delivery, manual send, reversal accept/reject.

**Developer program:** Connected Vendors program. Contact: PioneerRxDataPrograms@PioneerRx.com. APIs are vendor-only (not given to pharmacies directly).

**Integration categories (31):** Accounting, adherence, audit, automation, claim assistance, compounding, consulting, DSCSA, data management, delivery, eMAR, e-prescribing, genetic testing, IVR, immunization, insurance, inventory, medical billing, merchant services, network/VPN, organizations, outbound messaging, patient engagement, payment processing, pharmacy supplies, mobile apps, printers/scanners, reconciliation, reporting, specialty, telepharmacy, website builder, wholesalers.

**Docs:** https://support.pioneerrx.com/apidoc/

### 2.2 PrimeRx (RedSail, formerly Micro Merchant Systems)

**Market position:** Second or third most popular for new pharmacy openings. Acquired by RedSail 02/2026.

**Integration capabilities:**
- 100+ interfaces (wholesalers, IVR, robotics, EMRs)
- HL7 bidirectional interface support
- 20+ wholesaler integrations (Cencora, Cardinal, McKesson)
- Surescripts Real-Time Prescription Benefit integration
- PrimeRx Cloud (web-based) launched 2024
- FillMyRefills patient-facing mobile app
- EnlivenHealth IVR integration
- ScriptDrop delivery integration

**API access:** No public REST API documented. Integration is primarily through HL7 interfaces, file-based data exchange, and pre-built vendor integrations. PrimeRx Cloud may introduce API capabilities.

**Data accessible:** Prescriptions, patients, providers, inventory, claims, wholesaler ordering.

### 2.3 BestRx (RedSail Technologies)

**Market position:** Growing, budget-friendly option for independent pharmacies.

**Integration capabilities:**
- RedSail PowerLine claims switch integration (cloud-native, API-first)
- BestPOS point-of-sale integration
- Credit card processor integrations
- Third-party service integrations (details not publicly documented)

**API access:** No public API. Integration through PowerLine switch and pre-built connectors within the RedSail ecosystem.

### 2.4 QS/1 NRx (RedSail Technologies)

**Market position:** Legacy system with loyal user base, ~300 interfaces.

**Integration capabilities:**
- Nearly 300 industry interfaces
- Prescription readers (En-Vision, ScriptAbility)
- Shipping (FedEx, UPS, USPS, DHL, Stamps.com, Pitney Bowes)
- TelePharmacy (TelePharm)
- Will-call bin management (GSL, McKesson, PickPoint, ScripClip, SunCrest)
- 340B (Hudson Headwaters, CaptureRx)

**API access:** No public API. File-based and proprietary interface protocols.

**Interface documentation:** https://info.redsailtechnologies.com/hubfs/pdfs/NRx-Interfaces.pdf

### 2.5 Rx30 (Outcomes/Cardinal Health)

**Market position:** Second largest market share among independents.

**Integration capabilities:**
- 80+ integration partners
- Fully automated e-scripts
- Clinical Opportunity Indicator (Outcomes platform)
- Updox integration
- No public API available

**Key note:** TDS (Rx30's parent) merged with Cardinal Health's Outcomes business in 2023, fully rebranding as Outcomes. The combined entity serves 40,000+ pharmacies including chains and grocery.

**API access:** No REST API. File-based exports and proprietary vendor integrations.

### 2.6 Computer-Rx (Outcomes/Cardinal Health)

**Market position:** Mid-tier, part of Outcomes family.

**Integration capabilities:**
- Win-Rx software with third-party interfaces
- Outcomes platform integration
- Dispill USA integration
- eMAR vendor integrations (3+ vendors)

**API access:** No public API. Primarily file-based.

### 2.7 Liberty Software

**Market position:** Growing indie-friendly platform, popular for new pharmacy openings.

**Integration capabilities:**
- REST API with API key authentication (7-digit keys)
- EHR bidirectional integration (custom API development)
- DocStation direct integration
- QuickBooks integration
- Multiple wholesaler connections

**API access:** Yes -- API keys generated within Liberty (RXQ platform). Described as supporting third-party integrations with unique API keys per integration.

**Developer docs:** https://libertysoftware.com/integrations/

### 2.8 McKesson EnterpriseRx

**Market position:** Primarily health system, mail-order, and specialty pharmacies. Less relevant for independents.

**Integration capabilities:**
- Web Portal API for health portal design
- Intake Toolkit interface (patient/provider profiles, Rx orders, image association)
- PO Prepare integration with McKesson Connect (SSO)
- Configurable data import/export with field mapping
- mscripts certified for mobile messaging

**API access:** Web Portal API available for certified vendors. Primarily enterprise-focused.

### 2.9 Datascan WinPharm

**Market position:** Smaller but growing among independents.

**Integration capabilities:**
- 75+ third-party integrations
- Wholesale EDI (electronic purchase orders, auto-replenishment)
- QuickBooks, Google Maps, USPS, FedEx, IMedicare, IMS
- Outcomes/MTM integration
- Prescribe Wellness adherence integration
- CPESN clinical care
- Compounding equipment (scale integration)
- eMAR vendors (3+ with more planned)
- Shipping integration

**API access:** Datascan advertises "built-in API capabilities" but specifics are not publicly documented. Likely proprietary vendor integrations.

---

## 3. Industry standards and protocols

### 3.1 NCPDP SCRIPT standard (e-prescribing)

**Current version:** NCPDP SCRIPT v2023011 (mandated by CMS for Part D beginning 01/01/2028)

**Transactions supported:**
- NewRx (new prescription)
- RxRenewalRequest/Response (refill authorization)
- CancelRx/CancelRxResponse
- RxChangeRequest/Response
- RxFill (fill status notification)
- RxTransferRequest/Response
- REMSInitiationRequest/Response
- Electronic Prior Authorization (ePA) -- now mandatory for EHR certification
- Real-Time Prescription Benefit (RTPB) -- Base EHR requirement effective 01/01/2028

**Data format:** XML-based with defined message schemas. Transmitted via Surescripts network.

**Transition timeline:**
- HTI-4 Final Rule (10/01/2025) formally adopted v2023011
- Health IT developers must update by 12/31/2027
- CMS Part D mandate: 01/01/2028
- Surescripts already supports early adopters with translation services

### 3.2 NCPDP Telecommunication standard (claims)

**Current version:** NCPDP Telecom D.0 (with Batch Standard IG v1.2)

**Mandatory since:** 01/01/2012 for all electronic retail pharmacy claims

**Transaction types:**
- B1: Billing (claim submission)
- B2: Reversal
- B3: Rebill
- E1: Eligibility verification
- P1/P2/P3/P4: Prior authorization
- N1/N2/N3: Information reporting
- D1: Predetermination of benefits
- S1: Service billing (pharmacist professional services)

**Data format:** Fixed-length field format with segment/field identifiers. Not JSON/REST natively.

**Modern REST wrappers:**
- **Starlight API** (starlightapi.com) -- JSON REST API for B1, B2, E1 transactions. No NCPDP certification required.
- **TransactRx** (transactrx.com) -- REST API for pharmacy/medical eligibility and claims. Accepts batch files in any format, converts to NCPDP D.0 or X12 837.
- **CoverMyMeds Pharmacy Claim API** -- NCPDP Telecom standard with minimal dev time.

### 3.3 HL7 FHIR for pharmacy

**Current US Core version:** v8.0.0 (FHIR R4)

**Pharmacy-relevant FHIR resources:**
- `Medication` -- drug definitions (RxNorm coding, extensible binding)
- `MedicationRequest` -- prescriptions/orders (replaces older MedicationOrder)
- `MedicationDispense` -- dispensing records
- `MedicationAdministration` -- under discussion for inclusion
- `Patient`, `Practitioner`, `Organization` -- supporting resources

**Coding standards:**
- Primary: RxNorm (Medication Clinical Drug)
- Optional: NDC (National Drug Code)
- USCDI Data Class: Medications

**Key notes:**
- Active medication list obtainable via MedicationRequest query alone (FHIR R4+)
- MedicationStatement no longer required for medication list queries
- US Core v9.0.0 in development

### 3.4 Surescripts network

**Scale:** 30.5 billion transactions in 2025 (+12% YoY), 2.32 million connected healthcare professionals.

**Services offered:**

| Service | Description | Volume (2025) |
|---------|-------------|---------------|
| E-Prescribing | NewRx, RxRenewal, CancelRx, RxChange via NCPDP SCRIPT | Core service |
| Medication History | Rx history from retail/mail-order pharmacies | Major service |
| Real-Time Prescription Benefit | Patient-specific pricing, coverage, alternatives | 1 billion responses |
| Electronic Prior Authorization | Automated PA submissions | 76,000+ prescribers |
| Eligibility | Patient pharmacy benefit verification | Standard |
| Clinical Direct Messaging | Secure provider-pharmacy communication | Growing |
| Specialty Patient Enrollment | Specialty Rx enrollment management | Growing |

**Integration requirements:**
- Formal partnership/certification process
- HIPAA Business Associate Agreement
- Application architecture documentation
- Data-mapping specification for NCPDP SCRIPT
- Compliance with Surescripts network security standards
- Access via approved pharmacy system vendors (most PMS already connected)

**For RxDesk:** Direct Surescripts integration is complex and unnecessary. RxDesk should consume data from PMS systems that are already Surescripts-connected rather than building a direct Surescripts interface.

### 3.5 EPCS (Electronic Prescribing for Controlled Substances)

**Governing regulation:** 21 CFR 1311 (DEA interim final rule, 03/31/2010)

**Requirements:**
- Pharmacy software must pass third-party audit/certification for EPCS receipt
- NCPDP SCRIPT v2017071 standard for EPCS transmissions
- Two-factor authentication for prescribers
- Digital signature linking each Rx to its prescriber
- Identity proofing for prescriber enrollment
- Electronic records retained minimum 3 years
- CMS SUPPORT Act: 70%+ of Schedule II-V Rx must be electronic for Medicare Part D

**Data flow:** Prescriber EHR -> Surescripts -> Pharmacy PMS. No direct API for RxDesk; data is consumed from the PMS.

### 3.6 DSCSA (Drug Supply Chain Security Act)

**Current status (2025-2026):**
- Full electronic interoperability mandate effective 11/24/2024
- Dispenser compliance (26+ staff): 11/27/2025
- Dispenser compliance (25 or fewer staff): 11/27/2026
- Distributor saleable returns: 08/27/2025

**Technical standards:**
- **GS1 EPCIS** (Electronic Product Code Information Services) for interoperable data exchange
- **GTIN** (Global Trade Identification Number) for product identification
- **GLN** (Global Location Number) for trading partner identification
- **GS1-128 barcodes** or **2D Data Matrix** on packages

**For RxDesk:** If building inventory or receiving features, DSCSA compliance requires verifying product identifiers (GTIN, serial number, lot, expiry) at the package level. Integration with wholesaler DSCSA systems (McKesson, Cencora, Cardinal) required.

### 3.7 ASAP PDMP reporting standard

**Current version:** v5.0

**Purpose:** Standardized format for pharmacies to report controlled substance dispensing to state Prescription Drug Monitoring Programs.

**v5.0 improvements:**
- 44 new data fields
- Enhanced compliance monitoring
- Improved data integrity
- Better patient matching
- New granular codes

**Coverage:** Used by every state with a PDMP. ONC-recognized standard.

**For RxDesk:** PDMP reporting is handled by the PMS. RxDesk could integrate with **PMP Gateway** (Appriss/Bamboo Health) to surface PDMP data in workflows.

---

## 4. Patient communication services

### 4.1 IVR systems

**EnlivenHealth Connect (Omnicell)**
- Personalized IVR automating patient communications
- Integrates with PMS systems (PrimeRx confirmed)
- Reduces phone transfer rates 12-15%
- Saves pharmacists ~30 min per 100 calls
- Channels: voice, SMS, email, chat
- Powered by Twilio infrastructure

**Outcomes IVR (Cardinal Health)**
- Part of Outcomes platform
- Integrates with Rx30, Computer-Rx
- Patient engagement and adherence messaging

### 4.2 SMS and messaging services

| Provider | HIPAA BAA | SMS rate (US) | Voice | Key features |
|----------|-----------|---------------|-------|-------------|
| **Twilio** | Yes | ~$0.0079/msg | Yes | HIPAA-eligible SMS, voice, WhatsApp. Requires BAA and architectural guidelines. Gold standard for healthcare. |
| **Vonage** (Nexmo) | Yes | ~$0.0081/msg | Yes | SMS API, virtual numbers ($0.90/mo). Less healthcare-specific. |
| **Plivo** | Available | ~$0.0070/msg | Yes | 220+ countries, 99.99% SLA, volume discounts. |
| **Bandwidth** | Yes | Competitive | Yes | Direct carrier (owns network), emergency services API. |
| **Paubox** | Yes | N/A | No | HIPAA-compliant email with encryption. |
| **SendGrid** | BAA available | N/A | No | Email delivery. Owned by Twilio. |
| **Resend** | Check BAA | N/A | No | Modern email API. May need HIPAA evaluation. |

### 4.3 Patient engagement platforms

**Digital Pharmacist (Outcomes)**
- Mobile app + web portal for pharmacies
- Prescription refill requests
- Appointment scheduling
- Two-way messaging

**Synerio**
- Unified patient engagement platform
- IVR, outbound messaging, automation
- PioneerRx Connected Vendor

**FillMyRefills (PrimeRx)**
- Patient-facing mobile app
- 24/7 refill requests, account access
- Tightly coupled to PrimeRx

### 4.4 HIPAA compliance requirements for communication

**Permitted without PHI:**
- Appointment reminders (no medical details)
- Administrative billing/insurance updates
- General follow-up instructions
- Opt-in/opt-out management

**Requirements when PHI is involved:**
- End-to-end encryption
- Business Associate Agreement with vendor
- Multi-factor authentication
- Audit trails
- Remote wipe capability
- Automatic sign-off
- Explicit patient consent (documented)
- Patient opt-out mechanism
- Penalties: up to $50,000 per incident

**For RxDesk:** Use Twilio with BAA for all patient messaging. Keep PHI out of SMS message content where possible (e.g., "Your prescription is ready" without naming the drug). Store consent records.

---

## 5. Drug data and clinical services

### 5.1 Free/open drug databases

**RxNorm API (NLM)**
- URL: https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html
- Auth: None required (free, no API key)
- Rate limit: 20 requests/second
- Format: JSON or XML
- Key endpoints:
  - `GET /REST/rxcui?idtype=NDC&id={ndc}` -- NDC to RxCUI lookup
  - `GET /REST/rxcui/{rxcui}/ndcs` -- RxCUI to active NDCs
  - `GET /REST/drugs?name={name}` -- drug name search
  - `GET /REST/interaction/list` -- drug-drug interactions
- Coverage: All US market medications, linked to FDB, Micromedex, Multum, Gold Standard

**openFDA API**
- URL: https://open.fda.gov/apis/
- Auth: API key (free, optional for higher rate limits)
- Format: JSON (Elasticsearch-based)
- Key endpoints:
  - `/drug/ndc` -- NDC directory (updated daily)
  - `/drug/event` -- adverse event reports
  - `/drug/label` -- product labeling/SPL
  - `/drug/enforcement` -- recall data
  - `/drug/drugsfda` -- approval data

**DailyMed (NLM)**
- URL: https://dailymed.nlm.nih.gov/dailymed/
- Drug label information, SPL documents
- REST API available for label lookups

### 5.2 Commercial drug databases

**First Databank (FDB) MedKnowledge**
- Deployment: Database file or Cloud Connector API
- Coverage: NDC, RxNorm, AHFS, DailyMed, Medicaid, Medicare
- Clinical modules: Drug-drug interactions, dose screening, allergy checking, therapeutic duplication, IV compatibility
- Used by 7 of top 10 EMRs
- Licensing: Commercial (contact FDB for pricing)
- URL: https://www.fdbhealth.info/

**Medi-Span (Wolters Kluwer)**
- Deployment: Database or API
- Coverage: Comprehensive drug data with clinical screening
- Modules: Dose screening, therapeutic conflict, ingredient-level analysis
- New: Medi-Span Expert AI with MCP server for AI applications
- Available APIs: Global clinical data screening
- URL: https://www.wolterskluwer.com/en/solutions/medi-span

**For RxDesk:** Start with RxNorm (free) and openFDA for drug lookups, NDC validation, and basic interaction checking. Upgrade to FDB or Medi-Span when clinical decision support is needed.

---

## 6. Insurance and PBM services

### 6.1 Real-time eligibility (E1 transaction)

**How it works:** Pharmacy submits NCPDP E1 transaction through a pharmacy switch to PBMs. Returns active coverage status, plan details, BIN/PCN, group number.

**Pharmacy switches:**
- **RedSail PowerLine** -- Cloud-native, API-first, NCPDP transaction processing, 99.99% uptime, millisecond response times. DirectTrust certified.
- **RelayHealth** (McKesson) -- Major switch for non-RedSail pharmacies
- **Emdeon/Change Healthcare** -- Now part of Optum/UnitedHealth

**Modern alternatives:**
- **Starlight API** -- JSON REST API for E1 eligibility. No NCPDP cert required.
- **TransactRx** -- REST API for pharmacy and medical eligibility
- **Surescripts Eligibility** -- Electronic benefit verification

### 6.2 Real-Time Prescription Benefit (RTPB)

- Available via Surescripts network
- 1 billion responses in 2025, 900,000+ prescribers
- Returns: patient-specific pricing, coverage details, PA flags, days' supply options, up to 5 therapeutic alternatives
- Will be required in Base EHR definition by 01/01/2028
- Accessed through PMS systems (PrimeRx, PioneerRx confirmed)

### 6.3 Prior authorization

- Surescripts Electronic Prior Authorization growing rapidly (76,000+ prescribers)
- CoverMyMeds (McKesson) is the largest ePA network
- ePA now mandatory for EHR certification (HTI-4 rule)

**For RxDesk:** Claims processing is handled by the PMS through pharmacy switches. RxDesk should read claim results from PMS (via PioneerRx Enterprise API or Rx Event API claim data) rather than process claims directly.

---

## 7. Wholesaler and supply chain

### 7.1 The Big Three wholesalers

| Wholesaler | 2024 revenue | Pharmacy ordering system |
|-----------|-------------|------------------------|
| **McKesson** | ~$300B+ | McKesson Connect (web portal + EDI) |
| **Cencora** (fka AmerisourceBergen) | ~$275B+ | ABC Order (web portal + EDI) |
| **Cardinal Health** | ~$200B+ | Cardinal Health Order Express (web portal + EDI) |

**Combined market share:** ~95% of US drug distribution

### 7.2 EDI ordering standards

Pharmacy-wholesaler ordering uses ANSI X12 EDI:
- **EDI 850** -- Purchase Order (pharmacy to wholesaler)
- **EDI 855** -- Purchase Order Acknowledgment
- **EDI 856** -- Advance Ship Notice
- **EDI 810** -- Invoice (wholesaler to pharmacy)
- **EDI 832** -- Price/Sales Catalog

**Alternative:** Most PMS systems handle wholesaler ordering natively through direct integrations. RxDesk would not typically need direct EDI connectivity.

### 7.3 DSCSA track-and-trace

- GS1 EPCIS standard for package-level tracking
- GTIN + serial number + lot + expiry on every saleable unit
- Pharmacies must verify product identifiers upon receipt
- Multiple DSCSA solution vendors: TraceLink, rfxcel (Antares Vision), SAP

### 7.4 340B program

**Split billing vendors:**
- Macro Helix (Central Split)
- Cervey (340B SplitNAV)
- SunRx
- Craneware Group
- Nuvem
- Pillr Health
- PharmaForce (340B TPA)

**How it works:** Split billing software interfaces with PMS and wholesaler systems. It maintains accumulators tracking 340B-eligible dispensing, then generates replenishment orders at 340B pricing through the wholesaler.

**For RxDesk:** If pharmacies on RxDesk participate in 340B, the platform should integrate with the pharmacy's 340B vendor (usually via file exports from PMS showing claim data by which the 340B system determines eligibility).

---

## 8. PDMP and immunization reporting

### 8.1 PDMP reporting and lookup

**Reporting:** Pharmacies report controlled substance dispensing to state PDMPs using ASAP v5.0 format. Handled by PMS software automatically.

**Lookup (for pharmacy workflows):**
- **PMP Gateway** (Appriss/Bamboo Health) -- API embedded in health IT systems
  - Pre-built connectivity to 500+ EHRs, PMS, and healthcare platforms
  - Supports 43 of 54 US PDMPs
  - 970,000 active physician/pharmacist users
  - Interstate queries via NABP PMP InterConnect (53 of 54 PDMPs)
  - Sub-2-second interstate response times
  - Free to PDMPs (NABP funded)

**For RxDesk:** Integrate PMP Gateway API to surface PDMP data in pharmacy workflows. This is a high-value feature for pharmacist decision support.

### 8.2 Immunization Information Systems (IIS)

**Current state:**
- 121,000+ live HL7 V2 interfaces with state IIS
- 30+ states mandate pharmacy immunization reporting
- 40+ states support bidirectional IIS communication

**Reporting methods:**
- HL7 V2 VXU messages (preferred, growing adoption)
- HL7 batch files
- Flat files (CSV) -- still common for pharmacies
- Manual data entry (declining)
- Emerging: HL7 FHIR APIs

**Transport:** SFTP, HTTPS, or state-specific mechanisms. Each state has different security requirements and HL7 specifications.

**Intermediaries:** Services like Iron Bridge standardize reporting across states, converting to consistent formats.

**For RxDesk:** Immunization reporting is typically handled by the PMS. If RxDesk manages immunization scheduling/administration, it would need to support HL7 V2 VXU generation or integrate with an intermediary service.

---

## 9. Payroll and HR integrations

### 9.1 Unified approach: Finch API

**Recommended strategy:** Use Finch (https://www.tryfinch.com/) as a unified API layer rather than building individual integrations.

- Covers 220+ HRIS and payroll systems
- Single data model across all providers
- SDKs: JavaScript, Python, Java, Kotlin, Go
- Webhooks for data change notifications
- Daily data refresh + on-demand refresh
- Pricing: Free (first 5 connections), $35/connection/month (Build plan)
- Handles: employee roster, payroll data, deductions, benefits

### 9.2 Direct integration options

| Provider | API type | Auth | Developer portal | Notes |
|----------|----------|------|-----------------|-------|
| **ADP** | REST API | OAuth 2.0 | developers.adp.com | Requires ADP API Central purchase or Marketplace partner acceptance. Sandbox available. |
| **Paychex** | REST API | OAuth 2.0 | developer.paychex.com | Partner program required. Weeks to months for production keys. |
| **Gusto** | Embedded REST API | OAuth 2.0 | embedded.gusto.com | Pre-built Flows for payroll, onboarding. Partner program. |
| **QuickBooks Payroll** | REST API (Premium) | OAuth 2.0 | developer.intuit.com | Requires Gold/Platinum App Partner tier. Up to 2 months for production keys. |
| **Paycom** | No public API | N/A | N/A | Only accessible via unified API providers (Finch, Merge). |
| **Square Payroll** | REST API | OAuth 2.0 | developer.squareup.com | Part of Square platform APIs. |

### 9.3 Alternative unified API: Merge

- 180+ HRIS/payroll integrations
- REST API with standardized data models
- Alternative to Finch, different pricing model

**For RxDesk:** Use Finch for payroll integration. It's the fastest path to broad compatibility. Build direct ADP or Gusto integrations later only if pharmacy customers demand it.

---

## 10. Delivery services

### 10.1 ScriptDrop

**API documentation:** https://docs.scriptdrop.co/

**APIs available:**
- Pharmacy API: `POST https://pharmacy.scriptdrop.co/api/v1/orders` (create order)
- Delivery API: Order management and tracking
- Program Request API: Find pharmacies within delivery radius
- Omni Request API: Multi-service request management

**Authentication:** Basic Auth (API key + secret, Base64-encoded in Authorization header). Keys obtained from ScriptDrop support.

**Features:**
- Same-day and on-demand delivery
- Saturday service levels
- Order cancellation (DELETE endpoint for new/submitted orders)
- HIPAA-compliant courier network (Uber Health, Roadie, local couriers)
- PMS integrations: PrimeRx, EnterpriseRx, Epic, Cerner

### 10.2 Other delivery options

- **Uber Health** -- API for ride and delivery scheduling in healthcare
- **Roadie** -- Gig-economy delivery, ScriptDrop partner
- **DoorDash Drive** -- White-label delivery API
- **Pharmacy-owned delivery** -- Most PMS systems support delivery tracking (PioneerRx has delivery event in Rx Event API)

---

## 11. Recommended API architecture for RxDesk

### 11.1 Integration layer design

```
                    +--------------------------+
                    |        RxDesk SaaS       |
                    |  (Next.js + Prisma + PG) |
                    +-----------+--------------+
                                |
                    +-----------+--------------+
                    |   Integration Gateway    |
                    |   (API routes + queues)   |
                    +-----------+--------------+
                                |
        +-----------+-----------+-----------+-----------+
        |           |           |           |           |
   PMS Adapters  Comms Layer  Drug Data   Payroll    Delivery
        |           |           |           |           |
  +-----------+ +--------+ +--------+ +--------+ +---------+
  | PioneerRx | | Twilio | | RxNorm | | Finch  | |ScriptDrop|
  | Liberty   | |SendGrid| |openFDA | |        | |          |
  | File      | |        | | FDB*   | |        | |          |
  | Import    | |        | |        | |        | |          |
  +-----------+ +--------+ +--------+ +--------+ +---------+
```

### 11.2 PMS adapter pattern

Build a `PharmacyAdapter` interface that each PMS integration implements:

```typescript
interface PharmacyAdapter {
  // Patient data
  getPatient(id: string): Promise<Patient>;
  searchPatients(query: PatientSearchQuery): Promise<Patient[]>;

  // Prescription data
  getPrescription(id: string): Promise<Prescription>;
  getPatientPrescriptions(patientId: string): Promise<Prescription[]>;

  // Prescriber data
  getPrescriber(id: string): Promise<Prescriber>;
  searchPrescribers(query: PrescriberSearchQuery): Promise<Prescriber[]>;

  // Events (webhook receiver)
  handleEvent(event: PharmacyEvent): Promise<void>;
}
```

**Implementations:**
1. `PioneerRxAdapter` -- REST API (Enterprise API + Rx Event webhooks)
2. `LibertyAdapter` -- REST API (API key auth)
3. `FileImportAdapter` -- CSV/HL7 file processing (for Rx30, NRx, Computer-Rx, BestRx, Datascan)
4. `HL7Adapter` -- HL7 v2 message parsing (for PrimeRx and others)

### 11.3 Event-driven architecture

Use the PioneerRx Rx Event API model as the canonical event format:

```typescript
type PharmacyEventType =
  | 'rx.filled'
  | 'rx.held'
  | 'rx.cancelled'
  | 'rx.transferred'
  | 'rx.checked'
  | 'rx.ready'
  | 'rx.delivered'
  | 'inventory.adjusted'
  | 'patient.updated'
  | 'claim.processed';
```

For PMS systems without webhooks, implement polling or file-watch mechanisms.

### 11.4 Communication architecture

```typescript
// Twilio-backed notification service
interface NotificationService {
  sendSMS(to: string, template: NotificationTemplate, data: Record<string, string>): Promise<void>;
  sendVoiceCall(to: string, twiml: string): Promise<void>;
  sendEmail(to: string, template: EmailTemplate, data: Record<string, string>): Promise<void>;
}
```

- BAA with Twilio required before handling PHI
- Keep PHI out of SMS content (use generic messages)
- Track patient consent and opt-out in database
- Use Twilio for SMS + voice, SendGrid/Resend for email

---

## 12. Recommended database schema additions

```prisma
// PMS connection configuration
model PharmacySystem {
  id            String   @id @default(cuid())
  orgId         String
  type          PharmacySystemType // PIONEERRX, LIBERTY, RX30, PRIMERX, etc.
  name          String
  apiUrl        String?
  apiKey        String?  // encrypted
  apiSecret     String?  // encrypted
  authMethod    AuthMethod // SHA512_SIGNATURE, API_KEY, BASIC_AUTH, FILE_IMPORT
  webhookUrl    String?  // our endpoint for receiving events
  webhookSecret String?  // encrypted
  syncStatus    SyncStatus
  lastSyncAt    DateTime?
  config        Json     // system-specific configuration
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  org           Organization @relation(fields: [orgId], references: [id])

  @@index([orgId])
}

enum PharmacySystemType {
  PIONEERRX
  LIBERTY
  PRIMERX
  RX30
  COMPUTER_RX
  BESTRX
  NRX_QS1
  DATASCAN
  MCKESSON_ERX
  OTHER
}

enum AuthMethod {
  SHA512_SIGNATURE
  API_KEY
  BASIC_AUTH
  OAUTH2
  FILE_IMPORT
  HL7
}

enum SyncStatus {
  ACTIVE
  SYNCING
  ERROR
  DISCONNECTED
}

// Normalized patient from PMS
model ExternalPatient {
  id              String   @id @default(cuid())
  orgId           String
  pharmacySystemId String
  externalId      String   // ID in PMS
  firstName       String
  lastName        String
  dateOfBirth     DateTime
  phone           String?
  email           String?
  address         Json?
  allergies       Json?
  conditions      Json?
  insuranceInfo   Json?
  consentSms      Boolean  @default(false)
  consentEmail    Boolean  @default(false)
  consentVoice    Boolean  @default(false)
  lastSyncAt      DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  pharmacySystem  PharmacySystem @relation(fields: [pharmacySystemId], references: [id])

  @@unique([pharmacySystemId, externalId])
  @@index([orgId])
  @@index([lastName, dateOfBirth])
}

// Prescription events from PMS
model PrescriptionEvent {
  id              String   @id @default(cuid())
  orgId           String
  pharmacySystemId String
  externalRxId    String
  eventType       String   // rx.filled, rx.ready, rx.held, etc.
  patientId       String?
  drugName        String?
  drugNdc         String?
  rxNumber        String?
  quantity        Decimal?
  daysSupply      Int?
  prescriberId    String?
  claimData       Json?
  rawPayload      Json     // original event data
  processedAt     DateTime?
  createdAt       DateTime @default(now())

  @@index([orgId, eventType])
  @@index([externalRxId])
  @@index([createdAt])
}

// Patient notification tracking
model NotificationLog {
  id              String   @id @default(cuid())
  orgId           String
  patientId       String
  channel         NotificationChannel
  templateId      String
  status          NotificationStatus
  providerMsgId   String?  // Twilio SID, etc.
  sentAt          DateTime?
  deliveredAt     DateTime?
  failedAt        DateTime?
  failureReason   String?
  createdAt       DateTime @default(now())

  @@index([orgId, patientId])
  @@index([createdAt])
}

enum NotificationChannel {
  SMS
  VOICE
  EMAIL
  PUSH
}

enum NotificationStatus {
  QUEUED
  SENT
  DELIVERED
  FAILED
  OPTED_OUT
}

// Drug reference cache (from RxNorm/openFDA)
model DrugReference {
  id          String   @id @default(cuid())
  ndc         String   @unique
  rxcui       String?
  drugName    String
  genericName String?
  brandName   String?
  dosageForm  String?
  strength    String?
  route       String?
  deaSchedule String?  // II, III, IV, V, or null
  packageInfo Json?
  lastUpdated DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([rxcui])
  @@index([drugName])
}

// Payroll integration
model PayrollConnection {
  id           String   @id @default(cuid())
  orgId        String
  provider     String   // finch, adp, gusto, etc.
  accessToken  String   // encrypted
  refreshToken String?  // encrypted
  companyId    String?
  status       SyncStatus
  lastSyncAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([orgId])
}
```

---

## 13. Integration priority matrix

### Phase 1: Foundation (months 1-3)

| Integration | Effort | Value | Rationale |
|------------|--------|-------|-----------|
| PioneerRx Enterprise API | Medium | High | Largest independent pharmacy PMS. REST API available. Unlocks patient, prescriber, Rx data. |
| PioneerRx Rx Event webhooks | Medium | High | Real-time Rx events (filled, ready, held). Powers notifications. |
| Twilio SMS/voice | Low | High | Patient notifications (Rx ready, refill reminders). HIPAA-eligible with BAA. |
| RxNorm API | Low | Medium | Free drug data lookups, NDC validation. No auth needed. |
| openFDA API | Low | Medium | NDC directory, drug labeling, recall alerts. Free. |

### Phase 2: Expand PMS coverage (months 3-6)

| Integration | Effort | Value | Rationale |
|------------|--------|-------|-----------|
| Liberty Software API | Medium | Medium | Growing PMS with API key auth. Second REST API target. |
| CSV/file import adapter | Medium | High | Covers Rx30, NRx, Computer-Rx, BestRx, Datascan via file exports. Broad reach. |
| HL7 v2 parser | High | Medium | Enables PrimeRx and legacy system integration. Reusable across many PMS. |
| Finch (payroll) | Low | Medium | Unified payroll across ADP, Paychex, Gusto, etc. One integration, 220+ systems. |

### Phase 3: Clinical and compliance (months 6-9)

| Integration | Effort | Value | Rationale |
|------------|--------|-------|-----------|
| PMP Gateway (PDMP) | Medium | High | PDMP data in pharmacy workflow. High regulatory value. |
| ScriptDrop delivery | Low | Medium | Prescription delivery API. Quick integration, clear docs. |
| FDB or Medi-Span | Medium | High | Clinical decision support (drug interactions, dose checking). Commercial license. |
| Immunization IIS (HL7 VXU) | High | Medium | State-specific, complex. Consider intermediary service. |

### Phase 4: Advanced (months 9-12)

| Integration | Effort | Value | Rationale |
|------------|--------|-------|-----------|
| 340B vendor integrations | High | Niche | Only for 340B-participating pharmacies. File-based usually. |
| PioneerRx POS API | Low | Medium | Front-end POS data for revenue analytics. |
| Wholesaler EDI connectors | High | Low | PMS handles ordering. Only build if RxDesk manages inventory. |
| DSCSA verification | High | Niche | Package-level verification. Only if RxDesk handles receiving. |

---

## 14. Sources

### PMS vendors
- [PioneerRx Connected Vendors](https://www.pioneerrx.com/connected-vendors)
- [PioneerRx API Documentation](https://support.pioneerrx.com/apidoc/)
- [PioneerRx Enterprise API](https://support.pioneerrx.com/apidoc/PioneerRxEnterpriseAPI/)
- [PioneerRx Rx Event API](https://support.pioneerrx.com/apidoc/RxEvents/)
- [PioneerRx Patient Data Exchange API](https://support.pioneerrx.com/apidoc/PatientDataExchangeAPI/)
- [PrimeRx Integrations](https://www.primerx.io/integrations/)
- [PrimeRx Real-Time Prescription Benefit](https://www.primerx.io/real-time-prescription-benefit-by-surescripts/)
- [BestRx - RedSail Technologies](https://www.redsailtechnologies.com/pharmacy-software/bestrx)
- [NRx by QS/1 - RedSail Technologies](https://www.redsailtechnologies.com/pharmacy-software/nrx)
- [NRx Interfaces PDF](https://info.redsailtechnologies.com/hubfs/pdfs/NRx-Interfaces.pdf)
- [Outcomes (Rx30/Computer-Rx)](https://www.outcomes.com/rx30)
- [Liberty Software Integrations](https://libertysoftware.com/integrations/)
- [Liberty Software API Keys Guide](https://pharmacymarketplace.com/knowledge/liberty-software-how-to-access-api-keys)
- [McKesson EnterpriseRx](https://www.mckesson.com/pharmacy-technology/solutions-software/pharmacy-management-software/enterpriserx-pharmacy-management-system/)
- [Datascan WinPharm Integrations](https://datascanpharmacy.com/pharmacy-software-partner-integrations/)
- [RedSail Technologies PowerLine](https://www.redsailtechnologies.com/powerline)
- [Pharmacy Software Market Share Study](https://www.pharmacysoftwarereviews.com/beta)

### Industry standards
- [NCPDP SCRIPT Standard Guide](https://intuitionlabs.ai/articles/ncpdp-script-standard-guide)
- [NCPDP Standards Access](https://standards.ncpdp.org/access-to-standards.aspx)
- [NCPDP Telecom D.0 Service Billing](https://www.ncpdp.org/NCPDP/media/images/Resources%20Items/NCPDP-Implementation-of-Telecommunication-Standard-vD-0-Service-Billing-Transactions-for-Pharmacist-Professional-Services.pdf)
- [CMS E-Prescribing Standards](https://www.cms.gov/medicare/regulations-guidance/electronic-prescribing/adopted-standard-and-transactions)
- [ONC Health IT Electronic Prescribing](https://healthit.gov/test-method/electronic-prescribing/)
- [HL7 FHIR US Core Medication List](https://hl7.org/fhir/us/core/medication-list.html)
- [US Core MedicationRequest Profile](https://www.hl7.org/fhir/us/core/StructureDefinition-us-core-medicationrequest.html)
- [DSCSA - FDA](https://www.fda.gov/drugs/drug-supply-chain-integrity/drug-supply-chain-security-act-dscsa)
- [DSCSA - GS1 US](https://www.supplychain.gs1us.org/standards-and-regulations/drug-supply-chain-security-act)
- [ASAP PDMP Reporting Standard v5.0](https://asapnet.org/asap-announces-new-version-of-its-standard-for-prescription-drug-monitoring-program-reporting/)
- [DEA EPCS FAQ](https://deadiversion.usdoj.gov/faq/epcs-faq.html)
- [CMS EPCS Program](https://www.cms.gov/medicare/e-health/eprescribing/cms-eprescribing-for-controlled-substances-program)

### Surescripts and network services
- [Surescripts 2025 Annual Impact Report](https://surescripts.com/insights/2025-annual-impact-report)
- [Surescripts E-Prescribing](https://surescripts.com/what-we-do/e-prescribing)
- [Surescripts Real-Time Prescription Benefit](https://surescripts.com/what-we-do/real-time-prescription-benefit)
- [Surescripts Eligibility](https://surescripts.com/what-we-do/eligibility)
- [Surescripts Integration Guide (TopFlight)](https://topflightapps.com/ideas/surescripts-integration/)

### Drug data
- [RxNorm API](https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html)
- [openFDA Drug APIs](https://open.fda.gov/apis/drug/)
- [FDB MedKnowledge](https://www.fdbhealth.info/)
- [Medi-Span APIs](https://www.wolterskluwer.com/en/solutions/medi-span/medi-span-around-the-world/available-apis)
- [Medi-Span Expert AI](https://www.wolterskluwer.com/en/news/medi-span-expert-ai-medication-intelligence-digital-health)

### PDMP
- [NABP PMP InterConnect](https://nabp.pharmacy/members/programs-services/pmp-interconnect/)
- [PMP Gateway (Appriss/Bamboo Health)](https://apprisshealth.com/solutions/pmp-gateway/)
- [ONC Pharmacy and PDMP](https://healthit.gov/pharmacy-pdmp/)

### Patient communication
- [Twilio HIPAA Compliance](https://www.twilio.com/en-us/hipaa)
- [Twilio Healthcare Solutions](https://www.twilio.com/en-us/solutions/healthcare)
- [EnlivenHealth IVR](https://enlivenhealth.co/patient-experience/ivr-system-for-pharmacy)
- [EnlivenHealth + Twilio Case Study](https://customers.twilio.com/en-us/enlivenhealth)
- [HIPAA Texting Rules (HIPAA Journal)](https://www.hipaajournal.com/texting-violation-hipaa/)
- [Vonage SMS API](https://www.vonage.com/communications-apis/sms/)
- [Bandwidth Communications APIs](https://www.bandwidth.com/)
- [Plivo SMS API](https://www.plivo.com/)

### Payroll
- [ADP Developer Resources](https://developers.adp.com/)
- [Paychex Developer Center](https://developer.paychex.com/)
- [Gusto Embedded Payroll API](https://embedded.gusto.com/product/payroll-api)
- [QuickBooks Payroll API](https://developer.intuit.com/app/developer/qbo/docs/workflows/integrate-with-payroll-api)
- [Finch Unified API](https://www.tryfinch.com/)

### Delivery
- [ScriptDrop Pharmacy API](https://docs.scriptdrop.co/)
- [ScriptDrop Delivery API](https://delivery.docs.scriptdrop.co/)
- [ScriptDrop Program Request API](https://program.docs.scriptdrop.co/)

### Claims processing
- [Starlight API (NCPDP D.0 REST)](https://starlightapi.com/blog)
- [TransactRx Claims Platform](https://www.transactrx.com/)
- [CoverMyMeds Pharmacy Claim API (GitHub)](https://github.com/covermymeds/pharmacy-claim-api-java-ref)

### Immunization
- [ONC IIS Data Exchange Standards](https://www.healthit.gov/isp/exchanging-immunization-data-immunization-registries)
- [AIRA Immunization Integration Program](https://www.immregistries.org/immunization-integration-program)

### 340B
- [Macro Helix Central Split](https://www.macrohelix.com/solutions/340b-admin/340b-central-split)
- [Cervey 340B SplitNAV](https://cervey.com/340b-splitnav/)
- [Nuvem Contract Pharmacy](https://nuvem.com/solutions/contract-pharmacy-split-billing/)

### Market intelligence
- [Pharmacy Management Systems Guide (IntuitionLabs)](https://intuitionlabs.ai/articles/pharmacy-management-systems-guide)
- [US Drug Wholesaler Market Concentration](https://intuitionlabs.ai/articles/drug-wholesaler-market-concentration)
- [Pharmacy Software Market Size Forecast 2033](https://www.globalgrowthinsights.com/market-reports/pharmacy-software-market-112741)
