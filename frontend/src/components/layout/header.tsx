"use client";

import React, { useState, useEffect } from "react";
import { Menu, Bell, Moon, Sun, User, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchApi } from "@/lib/api";

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check dark mode
    if (document.documentElement.classList.contains("dark")) {
      setIsDark(true);
    }

    // Load unread count
    fetchUnread();
  }, []);

  const fetchUnread = async () => {
    try {
      const data = await fetchApi<{ unread_count: number }>("/api/v1/notifications/unread-count");
      setUnreadCount(data.unread_count);
    } catch {}
  };

  const loadNotifications = async () => {
    try {
      const list = await fetchApi<any[]>("/api/v1/notifications");
      setNotifications(list);
      setShowNotifications(!showNotifications);
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetchApi("/api/v1/notifications/read-all", { method: "POST" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
    } catch {}
  };

  const toggleDarkMode = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 sm:px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center space-x-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">
          Academic Session 2026-2027
        </span>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          title="Toggle Dark Mode"
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={loadNotifications}
            className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center text-[11px] font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    <Check className="mr-1 h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="mt-2 max-h-64 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-xl p-2.5 text-xs transition-colors ${
                        n.read_at
                          ? "bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300"
                          : "bg-primary-50/70 dark:bg-primary-950/40 text-slate-900 dark:text-slate-100 font-medium"
                      }`}
                    >
                      <p className="font-bold text-[11px]">{n.title}</p>
                      <p className="mt-0.5 text-[11px] opacity-80">{n.message}</p>
                      <span className="mt-1 block text-[9px] text-slate-400">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Pill */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-xs dark:bg-primary-950 dark:text-primary-300">
            {user?.full_name?.charAt(0) || "U"}
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden md:inline">
            {user?.full_name?.split(" ")[0]}
          </span>
        </div>
      </div>
    </header>
  );
}
