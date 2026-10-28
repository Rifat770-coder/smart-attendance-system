"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Percent,
  Sliders,
  Scale,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DeptAdminPolicyPage() {
  const queryClient = useQueryClient();
  const [minPercentage, setMinPercentage] = useState<number>(75);
  const [lateWeight, setLateWeight] = useState<number>(0.5);
  const [allowedLateMinutes, setAllowedLateMinutes] = useState<number>(15);
  const [gracePeriodSeconds, setGracePeriodSeconds] = useState<number>(5);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load policies
  const { data: policies = [], isLoading } = useQuery<any[]>({
    queryKey: ["dept-policies"],
    queryFn: () => fetchApi<any[]>("/api/v1/admin/policies"),
  });

  const activePolicy = policies[0];

  useEffect(() => {
    if (activePolicy) {
      setMinPercentage(activePolicy.minimum_percentage ?? 75);
      setLateWeight(activePolicy.late_weight ?? 0.5);
      setAllowedLateMinutes(activePolicy.allowed_late_minutes ?? 15);
      setGracePeriodSeconds(activePolicy.grace_period_seconds ?? 5);
    }
  }, [activePolicy]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!activePolicy?.id) {
        throw new Error("No policy ID found.");
      }
      return fetchApi(`/api/v1/admin/policies/${activePolicy.id}`, {
        method: "PUT",
        body: JSON.stringify({
          minimum_percentage: Number(minPercentage),
          late_weight: Number(lateWeight),
          allowed_late_minutes: Number(allowedLateMinutes),
          grace_period_seconds: Number(gracePeriodSeconds),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dept-policies"] });
      setFeedback({ type: "success", message: "Department attendance policy updated successfully!" });
    },
    onError: (err: any) => {
      setFeedback({ type: "error", message: err.message || "Failed to update policy." });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    updateMutation.mutate();
  };

  // Preview calculations
  const sampleSessions = 10;
  const samplePresent = 7;
  const sampleLate = 2;
  const sampleAbsent = 1;
  const calculatedAttendance = Math.round(
    ((samplePresent + sampleLate * lateWeight) / sampleSessions) * 100
  );
  const isCompliant = calculatedAttendance >= minPercentage;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Attendance Rules & Compliance Policy
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Configure department minimum attendance thresholds, late weights, and grace periods.
            </p>
          </div>
        </div>

        {feedback && (
          <div
            className={`rounded-2xl p-4 flex items-center gap-2 text-xs font-semibold ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200"
                : "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300 border border-red-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-primary-600" />
                  Policy Parameters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Min Percentage */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Minimum Attendance Required for Exam Eligibility (%)
                      </label>
                      <span className="text-sm font-extrabold text-primary-600">
                        {minPercentage}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={minPercentage}
                      onChange={(e) => setMinPercentage(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600 dark:bg-slate-700"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Students below this mark are automatically tagged with a low attendance warning.
                    </p>
                  </div>

                  {/* Late Weight */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Late Attendance Credit Weight (0.0 to 1.0)
                      </label>
                      <span className="text-sm font-extrabold text-primary-600">
                        {lateWeight}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.1"
                      value={lateWeight}
                      onChange={(e) => setLateWeight(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600 dark:bg-slate-700"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Credit given when a student attends but marks late. 0.5 = 2 Late sessions count as 1 Present session.
                    </p>
                  </div>

                  {/* Allowed Late Minutes */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Allowed Late Minutes
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={allowedLateMinutes}
                          onChange={(e) => setAllowedLateMinutes(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs font-medium focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Minutes after session start time before scan is marked Late.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        QR Token Grace Period (Sec)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={gracePeriodSeconds}
                        onChange={(e) => setGracePeriodSeconds(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <p className="mt-1 text-[10px] text-slate-400">
                        Leniency buffer accommodating network latency during QR rotation.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="bg-primary-600 text-white hover:bg-primary-500 font-semibold shadow-md"
                    >
                      {updateMutation.isPending ? "Saving..." : "Save Policy Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Math Preview Card */}
          <div>
            <Card className="border border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary-600" />
                  Formula Simulation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 space-y-1">
                  <div className="text-slate-500">Mathematical Formula:</div>
                  <div className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                    Percentage = ((Present + Late × {lateWeight}) ÷ Total Completed) × 100
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Sample Scenario (10 Completed Lectures):
                  </span>
                  <div className="grid grid-cols-3 gap-1 text-center py-1">
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 font-semibold">
                      {samplePresent} Present
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg text-amber-700 dark:text-amber-400 font-semibold">
                      {sampleLate} Late
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/40 p-1.5 rounded-lg text-red-700 dark:text-red-400 font-semibold">
                      {sampleAbsent} Absent
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-slate-500">Calculated Rate:</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {calculatedAttendance}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Compliance Status:</span>
                    <span
                      className={`font-bold ${
                        isCompliant ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {isCompliant ? "Eligible (Pass)" : "Low Attendance Warning"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
