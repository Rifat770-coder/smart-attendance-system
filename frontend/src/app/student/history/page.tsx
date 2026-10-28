"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, CheckCircle, Clock, XCircle, AlertCircle, Send, MessageSquare } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export default function StudentHistoryPage() {
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [requestedStatus, setRequestedStatus] = useState("PRESENT");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load sessions and attendance records
  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ["student-sessions"],
    queryFn: () => fetchApi<any[]>("/api/v1/attendance/sessions"),
  });

  // Load student's correction requests
  const { data: corrections, refetch: refetchCorrections } = useQuery({
    queryKey: ["student-corrections"],
    queryFn: () => fetchApi<any[]>("/api/v1/corrections"),
  });

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setFormError("Please provide an explanatory reason.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      await fetchApi("/api/v1/corrections", {
        method: "POST",
        body: JSON.stringify({
          record_id: selectedRecord.record_id,
          requested_status: requestedStatus,
          reason: reason.trim(),
        }),
      });

      setSuccessMsg("Correction request submitted for review.");
      setSelectedRecord(null);
      setReason("");
      refetchCorrections();
    } catch (err: any) {
      setFormError(err.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
            <History className="mr-2 h-5 w-5 text-primary-600" />
            Attendance History & Corrections
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            View completed sessions, verify attendance statuses, or file correction requests.
          </p>
        </div>

        {successMsg && (
          <div className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Sessions List */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Session History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                        <th className="pb-3 font-semibold">Date & Time</th>
                        <th className="pb-3 font-semibold">Course & Section</th>
                        <th className="pb-3 font-semibold">Session Title</th>
                        <th className="pb-3 font-semibold">State</th>
                        <th className="pb-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sessions?.map((sess) => (
                        <tr key={sess.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 font-medium text-slate-700 dark:text-slate-300">
                            {sess.session_date}
                            <span className="block text-[10px] text-slate-400">
                              {sess.start_time} - {sess.end_time}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {sess.course_code}
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              {sess.section_name}
                            </span>
                          </td>
                          <td className="py-3 text-slate-700 dark:text-slate-300">
                            {sess.title}
                          </td>
                          <td className="py-3">
                            <Badge
                              variant={
                                sess.state === "ACTIVE"
                                  ? "active"
                                  : sess.state === "PAUSED"
                                  ? "paused"
                                  : sess.state === "COMPLETED"
                                  ? "completed"
                                  : "default"
                              }
                            >
                              {sess.state}
                            </Badge>
                          </td>
                          <td className="py-3 text-right">
                            {sess.state === "COMPLETED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setSelectedRecord({
                                    record_id: sess.id, // Mock reference
                                    title: sess.title,
                                    course: sess.course_code,
                                  })
                                }
                              >
                                Fix Record
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}

                      {(!sessions || sessions.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            No attendance sessions recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Correction Requests Status */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <MessageSquare className="mr-2 h-4 w-4 text-primary-600" />
                  My Correction Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {corrections?.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {c.course_code}
                      </span>
                      <Badge
                        variant={
                          c.status === "APPROVED"
                            ? "present"
                            : c.status === "REJECTED"
                            ? "absent"
                            : "warning"
                        }
                      >
                        {c.status}
                      </Badge>
                    </div>

                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      Requested: <span className="font-semibold">{c.requested_status}</span>
                    </p>
                    <p className="mt-1 text-slate-500 italic text-[11px]">
                      "{c.reason}"
                    </p>

                    {c.justification && (
                      <div className="mt-2 rounded-lg bg-white p-2 text-[10px] text-slate-700 dark:bg-slate-900 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <span className="font-bold">Reviewer Note: </span>
                        {c.justification}
                      </div>
                    )}
                  </div>
                ))}

                {(!corrections || corrections.length === 0) && (
                  <p className="py-6 text-center text-xs text-slate-400">
                    No pending or past correction requests.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Correction Request Modal */}
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title="Submit Attendance Correction Request"
          description={`Request status update for ${selectedRecord?.course || ""}: ${selectedRecord?.title || ""}`}
        >
          <form onSubmit={handleCorrectionSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Requested Status
              </label>
              <select
                value={requestedStatus}
                onChange={(e) => setRequestedStatus(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="PRESENT">PRESENT (e.g. Scanner glitch)</option>
                <option value="EXCUSED">EXCUSED (e.g. Approved medical/official leave)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Justification / Reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why your attendance record should be corrected..."
                rows={3}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="outline" type="button" onClick={() => setSelectedRecord(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Submit Request
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
