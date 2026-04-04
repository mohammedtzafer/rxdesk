"use client";

import { useState, useEffect } from "react";
import { BellOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export default function ProfilePage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    fetch("/api/notifications?limit=20")
      .then((r) =>
        r.ok ? r.json() : { notifications: [], unreadCount: 0 }
      )
      .then((data: NotificationsResponse) => {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
        setLoading(false);
      });
  }, []);

  const markAllRead = async () => {
    setMarkingRead(true);
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    setMarkingRead(false);
  };

  return (
    <div>
      <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
        Profile
      </h1>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-[#0071e3] text-white text-[10px] px-1.5 py-0.5 font-semibold">
                {unreadCount}
              </Badge>
            )}
          </h2>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingRead}
              className="text-[14px] text-[#0071e3] hover:text-[#0077ED] transition-colors disabled:opacity-50"
            >
              {markingRead ? "Marking..." : "Mark all as read"}
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl overflow-hidden">
          {loading ? (
            <div className="divide-y divide-[rgba(0,0,0,0.03)]">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="h-4 w-48 bg-[rgba(0,0,0,0.05)] rounded animate-pulse" />
                  <div className="h-3 w-64 bg-[rgba(0,0,0,0.04)] rounded animate-pulse mt-1.5" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <BellOff
                className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.15)]"
                aria-hidden="true"
              />
              <h3 className="mt-4 text-[21px] font-bold text-[#1d1d1f]">
                No notifications
              </h3>
              <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)]">
                You&apos;re all caught up.
              </p>
            </div>
          ) : (
            <div
              className="divide-y divide-[rgba(0,0,0,0.03)]"
              aria-live="polite"
              aria-label="Notification list"
            >
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 transition-colors ${
                    !n.read ? "bg-[#0071e3]/[0.02]" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!n.read && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-[#0071e3] shrink-0"
                            aria-label="Unread"
                          />
                        )}
                        <p
                          className={`text-[14px] ${
                            !n.read ? "font-semibold" : "font-normal"
                          } text-[#1d1d1f]`}
                        >
                          {n.title}
                        </p>
                      </div>
                      <p className="text-[13px] text-[rgba(0,0,0,0.48)] mt-0.5 leading-snug">
                        {n.message}
                      </p>
                    </div>
                    <time
                      dateTime={n.createdAt}
                      className="text-[12px] text-[rgba(0,0,0,0.3)] shrink-0 mt-0.5"
                    >
                      {new Date(n.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
