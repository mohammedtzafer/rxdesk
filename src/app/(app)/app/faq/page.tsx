"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How do I upload prescription data?",
    a: "Go to Prescriptions → Upload CSV. Download the template, fill it with your PMS export data, and drag-and-drop the file. RxDesk auto-matches NPIs to providers in your directory.",
  },
  {
    q: "What CSV format does RxDesk accept?",
    a: "RxDesk accepts CSV files with columns: NPI, drug name, fill date (MM/DD/YYYY or YYYY-MM-DD), and optionally: quantity, days supply, payer type, and generic flag. Column names are flexible — we recognize common variations.",
  },
  {
    q: "How does the NPI search work?",
    a: "RxDesk searches the NPPES (National Plan and Provider Enumeration System) registry, the official federal database of all NPI numbers. Results include provider name, specialty, practice address, and phone number.",
  },
  {
    q: "What are the plan limits?",
    a: "Starter ($99/mo): 1 location, 50 providers, 3 team members, 1 CSV upload/month, 10 drug rep visits/month. Growth ($199/mo): 3 locations, unlimited providers, 15 members. Pro ($299/mo): unlimited everything plus API access and custom branding.",
  },
  {
    q: "How do drug rep correlations work?",
    a: "RxDesk compares prescription volume in the 4 weeks before and after each logged drug rep visit for linked providers. It flags volume changes, new drugs that match promoted medications, and shifts in brand vs. generic prescribing.",
  },
  {
    q: "Can employees work at multiple locations?",
    a: "Yes. Team members can be assigned to multiple locations with one set as their primary. They can clock in, view schedules, and manage time off across all assigned locations.",
  },
  {
    q: "How do I export payroll data?",
    a: "Go to Reports → Payroll Export. Select a date range, format (ADP, Paychex, Gusto, or generic CSV), and optionally filter by location. RxDesk generates a compatible file ready to import into your payroll provider.",
  },
  {
    q: "What notifications does RxDesk send?",
    a: "RxDesk sends in-app and email notifications for: schedule published/updated, time off requests submitted/approved/denied, shift swap requests, and timesheet approvals/rejections.",
  },
  {
    q: "Is my data secure?",
    a: "RxDesk does not store patient health information (PHI). Only aggregate prescription counts by NPI are stored. All data is encrypted in transit (TLS) and at rest. Each organization's data is isolated with strict access controls.",
  },
  {
    q: "How do I reset my password?",
    a: "Click 'Forgot password?' on the login page, enter your email, and check your inbox for a reset link. The link expires in 1 hour.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[rgba(0,0,0,0.06)] last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left group"
        aria-expanded={open}
      >
        <span className="text-[15px] font-medium text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors">
          {q}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-[rgba(0,0,0,0.48)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? "max-h-96" : "max-h-0"}`}>
        <p className="pb-4 text-[14px] text-[rgba(0,0,0,0.6)] leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">FAQ</h1>
        <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)]">Answers to common questions about RxDesk.</p>
      </div>

      <div className="max-w-2xl bg-white rounded-xl px-6 divide-y-0">
        {faqs.map((faq) => (
          <FAQItem key={faq.q} q={faq.q} a={faq.a} />
        ))}
      </div>

      <div className="mt-8 max-w-2xl">
        <div className="bg-[#0071e3]/5 border border-[#0071e3]/15 rounded-xl p-5">
          <p className="text-[14px] font-medium text-[#1d1d1f]">Still have questions?</p>
          <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.48)]">
            Email us at{" "}
            <a href="mailto:support@rxdesk.com" className="text-[#0071e3] hover:underline">
              support@rxdesk.com
            </a>{" "}
            and we'll get back to you within one business day.
          </p>
        </div>
      </div>
    </div>
  );
}
