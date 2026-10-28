"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  QrCode,
  Users,
  Play,
  Pause,
  CheckCircle,
  Plus,
  Clock,
  ArrowRight,
  Filter,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

export default function TeacherSessionsPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [rotationInterval, setRotationInterval] = useState(10);
  const [filterState, setFilterState] = useState<string>("ALL");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load sections
  const { data: sections } = useQuery({
    queryKey: ["teacher-sections"],
    queryFn: () => fetchApi<any[]>("/api/v1/academic/sections"),
  });

  // Load teacher sessions
  const { data: sessions = [], refetch: refetchSessions, isLoading } = useQuery({
    queryKey: ["teacher-sessions"],
    queryFn: () => fetchApi<any[]>("/api/v1/attendance/sessions"),
  });

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSectionId || !sessionTitle.trim()) {
      setErrorMsg("Please select a section and enter a session title.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetchApi("/api/v1/attendance/sessions", {
        method: "POST",
        body: JSON.stringify({
          section_id: selectedSectionId,
          title: sessionTitle.trim(),
          rotation_interval_seconds: rotationInterval,
        }),
      });

      setCreateModalOpen(false);
      setSessionTitle("");
      refetchSessions();
      window.location.href = `/teacher/sessions/${res.id}`;
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start session.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSessions = sessions.filter((s: any) => {
    if (filterState === "ALL") return true;
    return s.state === filterState;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Class Attendance Sessions
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage your live dynamic QR attendance sessions and review past records.
            </p>
          </div>

          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-primary-600 text-white hover:bg-primary-500 shadow-md font-semibold"
          >
            <Plus className="mr-2 h-4 w-4" />
            Launch New Session
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {["ALL", "ACTIVE", "PAUSED", "COMPLETED"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterState(st)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filterState === st
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {st === "ALL" ? "All Sessions" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500">
            Showing {filteredSessions.length} session{filteredSessions.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Sessions Grid */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">Loading sessions...</div>
        ) : filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <QrCode className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                No sessions found
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Launch a new session to begin recording student attendance with rotating QR codes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSessions.map((s: any) => {
              const isActive = s.state === "ACTIVE";
              const isPaused = s.state === "PAUSED";
              return (
                <Card
                  key={s.id}
                  className={`flex flex-col justify-between transition-all hover:shadow-md ${
                    isActive
                      ? "border-emerald-500 ring-2 ring-emerald-500/20"
                      : isPaused
                      ? "border-amber-500"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          isActive ? "success" : isPaused ? "warning" : "default"
                        }
                      >
                        {isActive && <span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block" />}
                        {s.state}
                      </Badge>
                      <span className="text-xs text-slate-400">{s.session_date}</span>
                    </div>
                    <CardTitle className="mt-2 text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                      {s.title}
                    </CardTitle>
                    <p className="text-xs text-slate-500">
                      Rotation: Every {s.rotation_interval_seconds}s
                    </p>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                      <div className="flex items-center text-xs text-slate-500">
                        <Clock className="mr-1 h-3.5 w-3.5" />
                        <span>{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <Link href={`/teacher/sessions/${s.id}`}>
                        <Button
                          size="sm"
                          variant={isActive ? "primary" : "outline"}
                          className="font-semibold text-xs"
                        >
                          {isActive ? "Enter Live Room" : "View Details"}
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Session Modal */}
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Launch Attendance Session"
        >
          <form onSubmit={handleCreateSession} className="space-y-4">
            {errorMsg && (
              <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Course Section *
              </label>
              <select
                required
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Select an assigned section...</option>
                {sections?.map((sec: any) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.course_code}: {sec.course_name} — Section {sec.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Session Title / Topic *
              </label>
              <input
                type="text"
                required
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="e.g., Lecture 08: Distributed Consensus Algorithms"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dynamic QR Rotation Speed
              </label>
              <select
                value={rotationInterval}
                onChange={(e) => setRotationInterval(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value={5}>Every 5 Seconds (High Security)</option>
                <option value={10}>Every 10 Seconds (Standard - Recommended)</option>
                <option value={15}>Every 15 Seconds (Relaxed)</option>
                <option value={20}>Every 20 Seconds</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary-600 text-white hover:bg-primary-500"
              >
                {submitting ? "Starting..." : "Start Session & Show QR"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
