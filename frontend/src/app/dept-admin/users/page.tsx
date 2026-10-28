"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Mail,
  GraduationCap,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  department_name: string;
  role_names: string[];
  student_profile?: {
    roll_number: string;
    batch_name: string;
  };
  teacher_profile?: {
    employee_id: string;
    designation: string;
  };
}

export default function DeptAdminUsersPage() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery<UserProfile[]>({
    queryKey: ["dept-users-list"],
    queryFn: () => fetchApi<UserProfile[]>("/api/v1/users"),
  });

  const toggleSuspendMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return fetchApi(`/api/v1/users/${userId}/suspend`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dept-users-list"] });
      setSelectedUser(null);
      setSuspendReason("");
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to update account status.");
    },
  });

  const handleToggleSuspend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    toggleSuspendMutation.mutate({
      userId: selectedUser.id,
      reason: suspendReason || (selectedUser.is_active ? "Administrative suspension" : "Account reactivated"),
    });
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole =
      roleFilter === "ALL" || u.role_names.includes(roleFilter);
    const matchesSearch =
      searchTerm === "" ||
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.student_profile?.roll_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.teacher_profile?.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Department Users Directory
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage student enrollments, faculty profiles, and user account status.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Total Accounts: {users.length}
            </span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, roll number, or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {["ALL", "STUDENT", "TEACHER", "DEPT_ADMIN"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  roleFilter === r
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {r === "ALL" ? "All Users" : r.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">User / Full Name</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Identifier / Batch</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      Loading users directory...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No users match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold dark:bg-slate-700 dark:text-slate-200">
                            {u.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {u.full_name}
                            </div>
                            <div className="text-slate-400 text-[11px] flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {u.role_names.map((rn) => (
                            <Badge
                              key={rn}
                              variant={
                                rn === "SUPER_ADMIN"
                                  ? "danger"
                                  : rn === "DEPT_ADMIN"
                                  ? "warning"
                                  : rn === "TEACHER"
                                  ? "default"
                                  : "success"
                              }
                            >
                              {rn.replace("_", " ")}
                            </Badge>
                          ))}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {u.student_profile ? (
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5 text-primary-500" />
                            <span>
                              Roll: <strong className="text-slate-800 dark:text-white">{u.student_profile.roll_number}</strong> ({u.student_profile.batch_name || "Enrolled"})
                            </span>
                          </div>
                        ) : u.teacher_profile ? (
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                            <span>
                              ID: {u.teacher_profile.employee_id} • {u.teacher_profile.designation}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Department Administration</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <Badge variant={u.is_active ? "success" : "danger"}>
                          {u.is_active ? "Active" : "Suspended"}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(u);
                            setSuspendReason("");
                            setActionError(null);
                          }}
                          className={`text-xs font-semibold ${
                            u.is_active
                              ? "text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/20"
                              : "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50"
                          }`}
                        >
                          {u.is_active ? (
                            <>
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              Suspend
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              Activate
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Suspend / Reactivate Confirmation Modal */}
        <Modal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title={
            selectedUser?.is_active
              ? `Suspend User: ${selectedUser.full_name}`
              : `Reactivate User: ${selectedUser?.full_name}`
          }
        >
          {selectedUser && (
            <form onSubmit={handleToggleSuspend} className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3.5 text-xs dark:bg-slate-800 space-y-1.5">
                <p>
                  <strong>User:</strong> {selectedUser.full_name} ({selectedUser.email})
                </p>
                <p>
                  <strong>Current Status:</strong>{" "}
                  <span className={selectedUser.is_active ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                    {selectedUser.is_active ? "ACTIVE" : "SUSPENDED"}
                  </span>
                </p>
                <p className="text-slate-500">
                  {selectedUser.is_active
                    ? "Suspension revokes login access and invalidates active session tokens immediately."
                    : "Reactivating this user will restore their university access and attendance eligibility."}
                </p>
              </div>

              {actionError && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Action *
                </label>
                <textarea
                  required
                  rows={2}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="State the administrative justification for this account change..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedUser(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={toggleSuspendMutation.isPending}
                  className={
                    selectedUser.is_active
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }
                >
                  {toggleSuspendMutation.isPending
                    ? "Updating..."
                    : selectedUser.is_active
                    ? "Confirm Suspension"
                    : "Confirm Reactivation"}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
