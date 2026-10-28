"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  QrCode,
  BookOpen,
  History,
  Calendar,
  FileText,
  Users,
  Settings,
  ShieldAlert,
  Activity,
  CheckSquare,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "../ui/card";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, isStudent, isTeacher, isDeptAdmin, isSuperAdmin, logout } = useAuth();

  let navItems: { label: string; href: string; icon: any }[] = [];

  if (isStudent) {
    navItems = [
      { label: "Dashboard", href: "/student", icon: LayoutDashboard },
      { label: "My Courses", href: "/student/courses", icon: BookOpen },
      { label: "Attendance History", href: "/student/history", icon: History },
      { label: "Class Routine", href: "/student/routine", icon: Calendar },
    ];
  } else if (isTeacher) {
    navItems = [
      { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
      { label: "Active Sessions", href: "/teacher/sessions", icon: QrCode },
      { label: "Reports & Analytics", href: "/teacher/reports", icon: FileText },
      { label: "Corrections Review", href: "/teacher/corrections", icon: CheckSquare },
    ];
  } else if (isDeptAdmin) {
    navItems = [
      { label: "Dept Overview", href: "/dept-admin", icon: LayoutDashboard },
      { label: "Students & Teachers", href: "/dept-admin/users", icon: Users },
      { label: "Course Sections", href: "/dept-admin/courses", icon: BookOpen },
      { label: "CSV Enrollment", href: "/dept-admin/enrollment", icon: FileText },
      { label: "Attendance Policy", href: "/dept-admin/policy", icon: Settings },
    ];
  } else if (isSuperAdmin) {
    navItems = [
      { label: "System Health", href: "/super-admin", icon: Activity },
      { label: "User Management", href: "/super-admin/users", icon: Users },
      { label: "Audit Logs", href: "/super-admin/audit", icon: ShieldAlert },
    ];
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-md shadow-primary-500/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                Attend<span className="text-primary-600">X</span>
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                University SaaS
              </span>
            </div>
          </div>
        </div>

        {/* User Role Tag */}
        <div className="px-6 py-4">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {user?.full_name || "User"}
            </p>
            <p className="text-[11px] font-medium text-primary-600 dark:text-primary-400">
              {user?.roles?.[0] || "User"}
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-primary-600 dark:text-primary-400" : "text-slate-400"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Bottom Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => logout()}
            className="flex w-full items-center space-x-3 rounded-xl px-3.5 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
