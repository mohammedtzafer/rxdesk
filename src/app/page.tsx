import Link from "next/link";
import { Pill, Users, Briefcase, TrendingUp, Clock, Shield } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Provider directory",
    desc: "Search the NPI registry, import providers, and track prescriber relationships.",
  },
  {
    icon: Pill,
    title: "Prescription analytics",
    desc: "Upload Rx data, see volume trends, and get alerts on declining prescribers.",
  },
  {
    icon: Briefcase,
    title: "Drug rep tracker",
    desc: "Log rep visits, track drugs promoted, and correlate with Rx volume changes.",
  },
  {
    icon: TrendingUp,
    title: "Trend analysis",
    desc: "Spot new prescribers, detect competitive threats, and monitor concentration risk.",
  },
  {
    icon: Clock,
    title: "Time tracking",
    desc: "Clock in/out, timesheets, scheduling, and PTO management built in.",
  },
  {
    icon: Shield,
    title: "Multi-location",
    desc: "Manage multiple pharmacy locations with rollup analytics and per-location filtering.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0071e3] flex items-center justify-center text-white font-bold text-xl mx-auto">
            Rx
          </div>
          <h1 className="mt-6 text-[32px] sm:text-[40px] md:text-[56px] font-semibold leading-[1.07] tracking-[-0.28px]">
            Know your prescribers.
            <br />
            Grow your scripts.
          </h1>
          <p className="mt-4 text-[17px] sm:text-[19px] md:text-[21px] font-normal leading-[1.19] tracking-[0.231px] text-white/70 max-w-2xl mx-auto">
            The prescriber relationship platform built for independent pharmacies. Track providers,
            analyze prescription trends, and manage drug rep visits — all in one place.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-6 py-3 bg-[#0071e3] text-white rounded-lg text-[17px] hover:bg-[#0077ED] transition-colors"
            >
              Start free trial
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3 border border-white/20 text-white rounded-lg text-[17px] hover:bg-white/10 transition-colors"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-3 text-[14px] text-white/40">
            14-day free trial. No credit card required.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#f5f5f7] py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-[28px] sm:text-[36px] md:text-[40px] font-semibold leading-[1.1] tracking-tight text-center text-[#1d1d1f]">
            Everything your pharmacy needs
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6">
                <f.icon className="w-8 h-8 text-[#0071e3]" />
                <h3 className="mt-3 text-[18px] sm:text-[21px] font-bold leading-[1.19] tracking-[0.231px] text-[#1d1d1f]">
                  {f.title}
                </h3>
                <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)] leading-[1.47] tracking-[-0.374px]">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="bg-black text-white py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-[28px] sm:text-[36px] md:text-[40px] font-semibold leading-[1.1] tracking-tight">
            Affordable for every pharmacy
          </h2>
          <p className="mt-4 text-[17px] sm:text-[19px] md:text-[21px] text-white/70 leading-[1.19]">
            Starting at $99/month. 6-18x cheaper than the only alternative.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block px-6 py-3 bg-[#0071e3] text-white rounded-lg text-[17px] hover:bg-[#0077ED] transition-colors"
          >
            Start your free trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f5f5f7] py-8 border-t border-black/5">
        <div className="max-w-5xl mx-auto px-4 text-center text-[12px] text-[rgba(0,0,0,0.48)]">
          &copy; 2026 RxDesk. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
