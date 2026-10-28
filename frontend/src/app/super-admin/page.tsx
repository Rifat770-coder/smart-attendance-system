"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Database,
  Cpu,
  Users,
  ShieldAlert,
  Server,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  HardDrive,
  Lock,
  RefreshCw,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SuperAdminDashboard() {
  const { data: health, isLoading, refetch } = useQuery({
    queryKey: ["super-admin-health"],
    queryFn: () => fetchApi<any>("/api/v1/admin/health"),
    refetchInterval: 5000, // Poll every 5s for live telemetry
  });

  const { data: securityEvents = [] } = useQuery({
    queryKey: ["super-admin-security-events"],
    queryFn: () => fetchApi<any[]>("/api/v1/admin/security-events?limit=5"),
  });

  const dbLatency = health?.database?.latency_ms ?? 0;
  const redisLatency = health?.redis?.latency_ms ?? 0;
  const totalUsers = health?.metrics?.total_users ?? 0;
  const activeSessions = health?.metrics?.active_attendance_sessions ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Banner */}
        <div className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl sm:flex-row sm:items-center border border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
                System Healthy • All Systems Operational
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Super Admin Console
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Live Cluster Telemetry, Database Health & Global University Governance
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="border-slate-700 text-slate-200 hover:bg-slate-800 font-semibold"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh Telemetry
            </Button>
            <Link href="/super-admin/audit">
              <Button size="sm" className="bg-primary-600 text-white hover:bg-primary-500 font-semibold shadow-md">
                <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
                Security Audit
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Infrastructure Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* PostgreSQL */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                PostgreSQL Database
              </span>
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Database className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {dbLatency} <span className="text-xs font-normal text-slate-500">ms</span>
                </div>
                <Badge variant={health?.database?.status === "connected" ? "success" : "danger"}>
                  {health?.database?.status === "connected" ? "ONLINE" : "OFFLINE"}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Query response latency</p>
            </CardContent>
          </Card>

          {/* Redis */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Redis In-Memory Cache
              </span>
              <div className="rounded-xl bg-red-50 p-2 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <Cpu className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {redisLatency} <span className="text-xs font-normal text-slate-500">ms</span>
                </div>
                <Badge variant={health?.redis?.status === "connected" ? "success" : "danger"}>
                  {health?.redis?.status === "connected" ? "ONLINE" : "OFFLINE"}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Dynamic QR TTL & Pub/Sub</p>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Live Attendance Rooms
              </span>
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {activeSessions}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Active QR rotation streams
              </p>
            </CardContent>
          </Card>

          {/* Total Registered Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total University Users
              </span>
              <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                <Users className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {totalUsers}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Super, Dept, Teachers & Students
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Governance & Quick Nav */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/super-admin/users" className="group">
            <Card className="h-full transition-all group-hover:border-primary-500 group-hover:shadow-md">
              <CardContent className="p-5 flex items-start space-x-4">
                <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
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
                    Cross-department user accounts, role grants, and global suspensions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/super-admin/audit" className="group">
            <Card className="h-full transition-all group-hover:border-primary-500 group-hover:shadow-md">
              <CardContent className="p-5 flex items-start space-x-4">
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-primary-600">
                      Security & Audit Logs
                    </h3>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-primary-600" />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Immutable event records for login attempts, QR submissions, and policy changes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="h-full border border-slate-200 dark:border-slate-800">
            <CardContent className="p-5 flex items-start space-x-4">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <HardDrive className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Automated Backups
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  PostgreSQL automated daily dump script available in <code className="text-primary-600">scripts/backup.sh</code>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Events Feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary-600" />
                Recent Security Events & Access Logs
              </CardTitle>
              <Link href="/super-admin/audit" className="text-xs text-primary-600 hover:underline">
                View Full Audit History
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {securityEvents.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {securityEvents.map((evt: any) => (
                  <div key={evt.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                        <span>{evt.event_type}</span>
                        <Badge variant="default" className="text-[10px]">
                          IP: {evt.ip_address || "127.0.0.1"}
                        </Badge>
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {evt.details ? JSON.stringify(evt.details) : "Routine security telemetry"}
                      </div>
                    </div>
                    <div className="text-right text-slate-400">
                      {new Date(evt.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No recent critical security events recorded.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
