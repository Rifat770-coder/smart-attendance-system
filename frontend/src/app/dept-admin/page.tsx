"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  GraduationCap,
  BookOpen,
  Settings,
  FileSpreadsheet,
  AlertTriangle,
  Activity,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DeptAdminDashboard() {
  const { user } = useAuth();

  // Load department metrics
  const { data: health } = useQuery({
    queryKey: ["admin-health"],
    queryFn: () => fetchApi<any>("/api/v1/admin/health"),
  });

  const { data: courses } = useQuery({
    queryKey: ["dept-courses"],
    queryFn: () => fetchApi<any[]>("/api/v1/academic/courses"),
  });

  const { data: sections } = useQuery({
    queryKey: ["dept-sections"],
    queryFn: () => fetchApi<any[]>("/api/v1/academic/sections"),
  });

  const { data: users } = useQuery({
    queryKey: ["dept-users"],
    queryFn: () => fetchApi<any[]>("/api/v1/users"),
  });

  const { data: auditLogs } = useQuery({
    queryKey: ["dept-audit-logs"],
    queryFn: () => fetchApi<any[]>("/api/v1/admin/audit-logs?limit=5"),
  });

  const students = users?.filter((u) => u.role_names.includes("STUDENT")) || [];
  const faculty = users?.filter((u) => u.role_names.includes("TEACHER")) || [];
  const activeSessions = health?.metrics?.active_attendance_sessions || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Banner */}
        <div className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 p-6 text-white shadow-xl sm:flex-row sm:items-center border border-slate-800">
          <div>
            <span className="inline-block rounded-full bg-primary-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-300 border border-primary-500/30">
              Department Administration Console
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Department Operations
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Computer Science & Engineering • Academic Year 2026-2027
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dept-admin/enrollment">
              <Button size="sm" className="bg-primary-600 text-white hover:bg-primary-500 font-semibold shadow-md">
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                Bulk CSV Enrollment
              </Button>
            </Link>
            <Link href="/dept-admin/policy">
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800 font-semibold">
                <Settings className="mr-1.5 h-4 w-4" />
                Policy
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Enrolled Students
              </span>
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <GraduationCap className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {students.length}
              </div>
              <p className="mt-1 text-xs text-slate-500">Registered across all batches</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Faculty Instructors
              </span>
              <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Users className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {faculty.length}
              </div>
              <p className="mt-1 text-xs text-slate-500">Teaching assigned sections</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Courses
              </span>
              <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                <BookOpen className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {courses?.length || 0}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {sections?.length || 0} active section cohorts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Live Class Sessions
              </span>
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {activeSessions}
                </span>
                {activeSessions > 0 && (
                  <Badge variant="success" className="animate-pulse">Live Now</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">Real-time attendance in progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Operations Links */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/dept-admin/users" className="group">
            <Card className="h-full transition-all group-hover:border-primary-500 group-hover:shadow-md">
              <CardContent className="p-5 flex items-start space-x-4">
                <div className="rounded-2xl bg-primary-50 p-3 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400">
                  <Users className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-primary-600">
                      User Management
                    </h3>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-primary-600" />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    View student directories, faculty rosters, and toggle account suspensions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dept-admin/courses" className="group">
            <Card className="h-full transition-all group-hover:border-primary-500 group-hover:shadow-md">
              <CardContent className="p-5 flex items-start space-x-4">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-primary-600">
                      Course Sections
                    </h3>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-primary-600" />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Create sections, assign instructors, and monitor enrolled cohort sizes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dept-admin/enrollment" className="group">
            <Card className="h-full transition-all group-hover:border-primary-500 group-hover:shadow-md">
              <CardContent className="p-5 flex items-start space-x-4">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-primary-600">
                      Bulk Enrollment
                    </h3>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-primary-600" />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Upload official CSV roster files to batch enroll students into section courses.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Audit Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary-600" />
                Recent Department Audit Trail
              </CardTitle>
              <Link href="/dept-admin/policy" className="text-xs text-primary-600 hover:underline">
                Configure Policies
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {auditLogs && auditLogs.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {log.action}
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        Initiated by <span className="font-medium text-slate-700 dark:text-slate-300">{log.user_name}</span> ({log.user_email})
                      </div>
                    </div>
                    <div className="text-right text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No recent audit events recorded.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
