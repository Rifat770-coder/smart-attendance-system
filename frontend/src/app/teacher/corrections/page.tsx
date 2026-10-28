"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  BookOpen,
  Calendar,
  MessageSquare,
  Filter,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface CorrectionItem {
  id: string;
  record_id: string;
  student_id: string;
  student_name: string;
  course_code: string;
  course_name: string;
  session_title: string;
  session_date: string;
  requested_status: string;
  previous_status: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewer_name: string | null;
  reviewed_at: string | null;
  justification: string | null;
  created_at: string;
}

export default function TeacherCorrectionsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("PENDING");
  const [selectedCorrection, setSelectedCorrection] = useState<CorrectionItem | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [justification, setJustification] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch corrections
  const { data: corrections = [], isLoading } = useQuery<CorrectionItem[]>({
    queryKey: ["teacher-corrections", filter],
    queryFn: () => {
      const query = filter && filter !== "ALL" ? `?status_filter=${filter}` : "";
      return fetchApi<CorrectionItem[]>(`/api/v1/corrections${query}`);
    },
  });

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      justification,
    }: {
      id: string;
      status: string;
      justification: string;
    }) => {
      return fetchApi(`/api/v1/corrections/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ status, justification }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-corrections"] });
      setSelectedCorrection(null);
      setJustification("");
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to process review.");
    },
  });

  const openReviewModal = (corr: CorrectionItem, decision: "APPROVED" | "REJECTED") => {
    setSelectedCorrection(corr);
    setReviewDecision(decision);
    setJustification(
      decision === "APPROVED"
        ? "Verified student attendance justification."
        : "Insufficient documentation or invalid reason."
    );
    setActionError(null);
  };

  const handleConfirmReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCorrection) return;
    if (!justification.trim()) {
      setActionError("Please provide a reviewer justification for the audit trail.");
      return;
    }
    reviewMutation.mutate({
      id: selectedCorrection.id,
      status: reviewDecision,
      justification: justification.trim(),
    });
  };

  const pendingCount = corrections.filter((c) => c.status === "PENDING").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Attendance Corrections Review
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Review and act on student attendance correction requests with full audit justification.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {["PENDING", "APPROVED", "REJECTED", "ALL"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filter === tab
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {tab === "PENDING" ? `Pending (${pendingCount})` : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Content list */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">Loading correction requests...</div>
        ) : corrections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <CheckSquare className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                No correction requests found
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filter === "PENDING"
                  ? "All student attendance requests have been processed."
                  : "No attendance correction records matching the current filter."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {corrections.map((corr) => (
              <Card key={corr.id} className="overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col p-5 sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-base">
                        {corr.student_name}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {corr.course_code}: {corr.course_name}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        {corr.session_title} ({corr.session_date})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-500">Status change:</span>
                        <Badge variant={corr.previous_status === "PRESENT" ? "success" : "danger"}>
                          {corr.previous_status}
                        </Badge>
                        <span className="text-slate-400">→</span>
                        <Badge variant={corr.requested_status === "PRESENT" ? "success" : "warning"}>
                          {corr.requested_status}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-1 text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Submitted {new Date(corr.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                        <MessageSquare className="h-3.5 w-3.5 text-primary-500" />
                        Student's Reason:
                      </div>
                      <p className="italic">"{corr.reason}"</p>
                    </div>

                    {corr.justification && (
                      <div className="rounded-lg bg-primary-50/50 p-2.5 text-xs text-slate-700 dark:bg-primary-950/20 dark:text-slate-300 border border-primary-100 dark:border-primary-900/30">
                        <div className="font-semibold text-primary-900 dark:text-primary-300">
                          Reviewer Note ({corr.reviewer_name || "Faculty"}):
                        </div>
                        <p>{corr.justification}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions / Status */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <Badge
                      variant={
                        corr.status === "APPROVED"
                          ? "success"
                          : corr.status === "REJECTED"
                          ? "danger"
                          : "warning"
                      }
                      className="px-2.5 py-1 text-xs font-bold"
                    >
                      {corr.status}
                    </Badge>

                    {corr.status === "PENDING" && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                          onClick={() => openReviewModal(corr, "REJECTED")}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => openReviewModal(corr, "APPROVED")}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Review Decision Modal */}
        <Modal
          isOpen={!!selectedCorrection}
          onClose={() => setSelectedCorrection(null)}
          title={
            reviewDecision === "APPROVED"
              ? "Approve Attendance Correction"
              : "Reject Attendance Correction"
          }
        >
          {selectedCorrection && (
            <form onSubmit={handleConfirmReview} className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3.5 text-xs dark:bg-slate-800 space-y-1.5">
                <p>
                  <strong>Student:</strong> {selectedCorrection.student_name}
                </p>
                <p>
                  <strong>Course:</strong> {selectedCorrection.course_code} - {selectedCorrection.course_name}
                </p>
                <p>
                  <strong>Session:</strong> {selectedCorrection.session_title}
                </p>
                <p>
                  <strong>Status Transition:</strong>{" "}
                  <span className="font-semibold text-red-600">{selectedCorrection.previous_status}</span> →{" "}
                  <span className="font-semibold text-emerald-600">{selectedCorrection.requested_status}</span>
                </p>
                <p className="pt-1 text-slate-500 italic">
                  Student Note: "{selectedCorrection.reason}"
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
                  Faculty Justification / Audit Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Provide audit justification for this decision (e.g. Verified paper attendance slip, medical excuse attached)..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedCorrection(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={reviewMutation.isPending}
                  className={
                    reviewDecision === "APPROVED"
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }
                >
                  {reviewMutation.isPending ? "Processing..." : `Confirm ${reviewDecision}`}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
