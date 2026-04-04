"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Plus, X, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  npiNumber: string | null;
  licenseNumber: string | null;
  isActive: boolean;
  _count: { users: number };
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    npiNumber: "",
    licenseNumber: "",
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    const res = await fetch("/api/locations");
    if (res.ok) setLocations(await res.json());
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zip: form.zip || undefined,
        phone: form.phone || undefined,
        npiNumber: form.npiNumber || undefined,
        licenseNumber: form.licenseNumber || undefined,
      }),
    });
    if (res.ok) {
      toast.success("Location created");
      setShowCreate(false);
      setForm({
        name: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        phone: "",
        npiNumber: "",
        licenseNumber: "",
      });
      fetchLocations();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create location");
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
            Locations
          </h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">
            {locations.length} location{locations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
        >
          <Plus className="w-4 h-4" /> Add location
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          [1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 h-40 animate-pulse" />
          ))
        ) : locations.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl p-12 text-center">
            <MapPin className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.15)]" />
            <h2 className="mt-4 text-[21px] font-bold text-[#1d1d1f]">No locations</h2>
            <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)]">
              Add your first pharmacy location.
            </p>
          </div>
        ) : (
          locations.map((loc) => (
            <div key={loc.id} className="bg-white rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f]">{loc.name}</h3>
                  {loc.address && (
                    <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.48)]">
                      {loc.address}
                      {loc.city ? `, ${loc.city}` : ""}
                      {loc.state ? `, ${loc.state}` : ""} {loc.zip}
                    </p>
                  )}
                </div>
                {!loc.isActive && (
                  <Badge variant="destructive" className="text-[10px]">
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-[rgba(0,0,0,0.48)]">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {loc._count.users} staff
                </span>
                {loc.phone && <span>{loc.phone}</span>}
                {loc.npiNumber && <span>NPI {loc.npiNumber}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[21px] font-bold text-[#1d1d1f]">Add location</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-[rgba(0,0,0,0.48)] hover:text-[#1d1d1f]"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <Label className="text-[12px]">Location name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="h-11"
                  placeholder="Main Street"
                />
              </div>
              <div>
                <Label className="text-[12px]">Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="h-11"
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[12px]">City</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div>
                  <Label className="text-[12px]">State</Label>
                  <Input
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="h-11"
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label className="text-[12px]">Zip</Label>
                  <Input
                    value={form.zip}
                    onChange={(e) => setForm({ ...form, zip: e.target.value })}
                    className="h-11"
                    maxLength={5}
                  />
                </div>
              </div>
              <div>
                <Label className="text-[12px]">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[12px]">Pharmacy NPI</Label>
                  <Input
                    value={form.npiNumber}
                    onChange={(e) => setForm({ ...form, npiNumber: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div>
                  <Label className="text-[12px]">License #</Label>
                  <Input
                    value={form.licenseNumber}
                    onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full h-10 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
              >
                Create location
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
