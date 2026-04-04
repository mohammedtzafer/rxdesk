"use client";

const AVATAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-green-500", "bg-amber-500",
  "bg-rose-500", "bg-teal-500", "bg-orange-500", "bg-cyan-500",
  "bg-pink-500", "bg-indigo-500",
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface EmployeeAvatarProps {
  name: string;
  size?: "sm" | "md";
}

export function EmployeeAvatar({ name, size = "sm" }: EmployeeAvatarProps) {
  const color = AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
  const initials = getInitials(name);
  const sizeClass = size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-xs";

  return (
    <div
      className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      aria-hidden="true"
      title={name}
    >
      {initials}
    </div>
  );
}
