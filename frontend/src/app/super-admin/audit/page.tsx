"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  User,
  Clock,
  ChevronDown,
  ChevronRight,
  Code2,
  Lock,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SuperAdminAuditPage() {
  const [tab, setTab] = useState<"AUDIT" | "SECURITY">("AUDIT");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load audit logs
  const { data: auditLogs = [], isLoading: auditLoading } = useQuery<any[]>({
    queryKey: ["super-admin-audit-logs"],
    queryFn: () => fetchApi<any[]>("/api/v1/admin/audit-logs?limit=100"),
    enabled: tab === "AUDIT",
  });

  // Load security events
  const { data: securityEvents = [], isLoading: secLoading } = useQuery<any[]>({
    queryKey: ["super-admin-security-events-full"],
    queryFn: () => fetchApi<any[]>("/api/v1/admin/security-events?limit=100"),
    enabled: tab === "SECURITY",
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredAudit = auditLogs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(term) ||
      log.user_email?.toLowerCase().includes(term) ||
      log.entity_type?.toLowerCase().includes(term) ||
      log.user_name?.toLowerCase().includes(term)
    );
  });

  const filteredSec = securityEvents.filter((evt) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      evt.event_type?.toLowerCase().includes(term) ||
      evt.ip_address?.toLowerCase().includes(term) ||
      JSON.stringify(evt.details || "").toLowerCase().includes(term)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Institutional Audit & Security Logs
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Immutable, server-logged audit records of system state mutations and security incidents.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setTab("AUDIT")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                tab === "AUDIT"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              System Audit Trail ({auditLogs.length})
            </button>
            <button
              onClick={() => setTab("SECURITY")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                tab === "SECURITY"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Security Events ({securityEvents.length})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              tab === "AUDIT"
                ? "Filter by action, user, or entity type..."
                : "Filter by event type, IP address..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* Tab 1: Audit Trail */}
        {tab === "AUDIT" && (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Action</th>
                    <th className="px-5 py-3.5">Actor</th>
                    <th className="px-5 py-3.5">Entity</th>
                    <th className="px-5 py-3.5">Timestamp</th>
                    <th className="px-5 py-3.5 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        Loading audit logs...
                      </td>
                    </tr>
                  ) : filteredAudit.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No audit logs found.
                      </td>
                    </tr>
                  ) : (
                    filteredAudit.map((log) => (
                      <React.Fragment key={log.id}>
                        <tr
                          onClick={() => toggleExpand(log.id)}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-slate-900 dark:text-white font-mono">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {log.user_name}
                            </div>
                            <div className="text-[11px] text-slate-400">{log.user_email}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant="default" className="text-[10px]">
                              {log.entity_type}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Button size="sm" variant="outline" className="text-[11px] h-7 px-2">
                              {expandedId === log.id ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </td>
                        </tr>

                        {expandedId === log.id && (
                          <tr className="bg-slate-50/80 dark:bg-slate-900/60">
                            <td colSpan={5} className="p-4">
                              <div className="rounded-xl bg-slate-900 p-3 text-slate-100 font-mono text-[11px] overflow-x-auto">
                                <div className="text-slate-400 mb-1 flex items-center gap-1.5 font-bold">
                                  <Code2 className="h-3.5 w-3.5" />
                                  Audit Payload & State Mutation Diff:
                                </div>
                                <pre>{JSON.stringify(log.diff, null, 2)}</pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Tab 2: Security Events */}
        {tab === "SECURITY" && (
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Security Event</th>
                    <th className="px-5 py-3.5">Origin IP</th>
                    <th className="px-5 py-3.5">Telemetry Details</th>
                    <th className="px-5 py-3.5 text-right">Occurred At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {secLoading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        Loading security logs...
                      </td>
                    </tr>
                  ) : filteredSec.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        No security events recorded.
                      </td>
                    </tr>
                  ) : (
                    filteredSec.map((evt) => (
                      <tr
                        key={evt.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-primary-600 shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-white font-mono">
                              {evt.event_type}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant="default" className="font-mono text-[11px]">
                            {evt.ip_address || "127.0.0.1"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          {evt.details ? JSON.stringify(evt.details) : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right text-slate-500 text-[11px]">
                          {new Date(evt.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
