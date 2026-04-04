"use client";

import { useState } from "react";
import { DAYS_OF_WEEK, getRoleColor, EmployeeWithAvailability } from "@/lib/schedule-types";
import { EmployeeAvatar } from "./employee-avatar";
import { UserPlus, Pencil, ChevronUp, ChevronDown, Search } from "lucide-react";

interface EmployeeListProps {
  employees: EmployeeWithAvailability[];
  onEdit: (employee: EmployeeWithAvailability) => void;
  onAdd: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function EmployeeList({
  employees,
  onEdit,
  onAdd,
  onReorder,
}: EmployeeListProps) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? employees.filter((emp) =>
        emp.name.toLowerCase().includes(search.toLowerCase())
      )
    : employees;

  return (
    <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.06)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.05)] space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[15px] text-[#1d1d1f]">
            Team ({employees.length})
          </h3>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0071e3] text-white rounded-lg text-[13px] hover:bg-[#0077ED] transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Add employee</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
        {employees.length > 3 && (
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(0,0,0,0.48)]"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-[rgba(0,0,0,0.08)] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-1"
              aria-label="Search employees"
            />
          </div>
        )}
      </div>

      {employees.length === 0 ? (
        <div
          className="p-10 text-center text-[14px] text-[rgba(0,0,0,0.48)]"
          role="status"
        >
          No employees yet. Add your first team member to get started.
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-[14px] text-[rgba(0,0,0,0.48)]">
          No employees matching &ldquo;{search}&rdquo;
        </div>
      ) : (
        <div
          className="divide-y divide-[rgba(0,0,0,0.04)]"
          role="list"
          aria-label="Employees"
        >
          {filtered.map((emp) => {
            const originalIndex = employees.indexOf(emp);
            const daysWorking = DAYS_OF_WEEK.filter(
              (d) => emp.availability[d]?.available
            );
            const uniqueRoles = [
              ...new Set(daysWorking.map((d) => emp.availability[d].role)),
            ];

            return (
              <div
                key={emp.id}
                role="listitem"
                className="flex items-center gap-1 px-3 py-2.5 hover:bg-[#f5f5f7] transition-colors"
              >
                {/* Reorder buttons — only show when not filtering */}
                {!search && (
                  <div className="flex flex-col flex-shrink-0">
                    <button
                      type="button"
                      disabled={originalIndex === 0}
                      onClick={() => onReorder(originalIndex, originalIndex - 1)}
                      aria-label={`Move ${emp.name} up`}
                      className="h-6 w-6 flex items-center justify-center rounded text-[rgba(0,0,0,0.24)] hover:text-[#1d1d1f] disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={originalIndex === employees.length - 1}
                      onClick={() => onReorder(originalIndex, originalIndex + 1)}
                      aria-label={`Move ${emp.name} down`}
                      className="h-6 w-6 flex items-center justify-center rounded text-[rgba(0,0,0,0.24)] hover:text-[#1d1d1f] disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}

                {/* Avatar + info */}
                <EmployeeAvatar name={emp.name} size="md" />
                <div className="flex-1 min-w-0 px-2">
                  <p className="font-medium text-[13px] text-[#1d1d1f] truncate">
                    {emp.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {uniqueRoles.map((role) => {
                      const color = getRoleColor(role);
                      return (
                        <span
                          key={role}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: color }}
                        >
                          {role}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[rgba(0,0,0,0.48)] mt-0.5">
                    {daysWorking.length} day{daysWorking.length !== 1 ? "s" : ""} / week
                    {emp.targetHoursPerWeek
                      ? ` · ${emp.targetHoursPerWeek}h target`
                      : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onEdit(emp)}
                  aria-label={`Edit ${emp.name}`}
                  className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-[rgba(0,0,0,0.48)] hover:text-[#1d1d1f] hover:bg-[#ebebeb] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
