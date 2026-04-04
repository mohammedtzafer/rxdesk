import { Pill } from "lucide-react";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
        Dashboard
      </h1>
      <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)]">
        Welcome to RxDesk. Your pharmacy analytics and management hub.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Rx", value: "—", sub: "Upload prescriptions to begin" },
          { label: "Active providers", value: "0", sub: "Add providers to track" },
          { label: "Drug rep visits", value: "0", sub: "This month" },
          { label: "Hours logged", value: "—", sub: "This pay period" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg p-5">
            <p className="text-[14px] text-[rgba(0,0,0,0.48)] tracking-[-0.224px]">
              {stat.label}
            </p>
            <p className="text-[28px] font-normal leading-[1.14] tracking-[0.196px] text-[#1d1d1f] mt-1">
              {stat.value}
            </p>
            <p className="text-[12px] text-[rgba(0,0,0,0.48)] tracking-[-0.12px] mt-1">
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg p-8 text-center">
        <Pill className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.2)]" />
        <h2 className="mt-4 text-[21px] font-bold leading-[1.19] tracking-[0.231px] text-[#1d1d1f]">
          Get started with RxDesk
        </h2>
        <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)] max-w-md mx-auto">
          Upload your prescription data to see analytics, or add providers to start tracking
          prescriber relationships.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <a
            href="/app/prescriptions/upload"
            className="inline-flex items-center px-5 py-2.5 bg-[#0071e3] text-white rounded-lg text-[17px] hover:bg-[#0077ED] transition-colors"
          >
            Upload prescriptions
          </a>
          <a
            href="/app/providers"
            className="inline-flex items-center px-5 py-2.5 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[17px] hover:bg-[#f5f5f7] transition-colors"
          >
            Add providers
          </a>
        </div>
      </div>
    </div>
  );
}
