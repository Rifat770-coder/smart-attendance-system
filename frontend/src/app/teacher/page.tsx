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
  FileText,
  Clock,
  Plus,
  BookOpen,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [rotationInterval, setRotationInterval] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load sections
  const { data: sections } = useQuery({
    queryKey: ["teacher-sections"],
    queryFn: () => fetchApi<any[]>("/api/v1/academic/sections"),
  });

  // Load teacher sessions
  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ["teacher-sessions"],
    queryFn: () => fetchApi<any[]>("/api/v1/attendance/sessions"),
  });

  const activeSession = sessions?.find((s) => s.state === "ACTIVE" || s.state === "PAUSED");

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 p-6 text-white shadow-xl sm:flex-row sm:items-center border border-slate-800">
          <div>
            <span className="inline-block rounded-full bg-primary-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-300 border border-primary-500/30">
              Faculty Instructor Portal
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Hello, {user?.full_name}
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Department of Computer Science & Engineering
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => setCreateModalOpen(true)}
            className="bg-primary-600 text-white hover:bg-primary-500 shadow-lg font-bold"
          >
            <Plus className="mr-2 h-5 w-5" />
            Start Attendance Session
          </Button>
        </div>

        {/* Active Session Notification Card */}
        {activeSession && (
          <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/80 bg-emerald-50/50 p-5 dark:bg-emerald-950/30 dark:border-emerald-700">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center space-x-2">
                  <Badge variant={activeSession.state === "ACTIVE" ? "active" : "paused"}>
                    {activeSession.state}
                  </Badge>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Live Session In Progress
                  </span>
                </div>
                <h3 className="mt-1.5 text-lg font-black text-slate-900 dark:text-white">
                  {activeSession.course_code}: {activeSession.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {activeSession.section_name} • Rotates every {activeSession.rotation_interval_seconds}s
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {activeSession.present_count} / {activeSession.enrolled_count}
                  </span>
                  <span className="block text-[10px] text-slate-400">Present</span>
                </div>
                <Link href={`/teacher/sessions/${activeSession.id}`}>
                  <Button size="md" className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                    Open Live Feed
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Course Sections */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center">
              <BookOpen className="mr-2 h-4 w-4 text-primary-600" />
              Assigned Courses & Sections
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sections?.map((sec) => (
              <Card key={sec.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                        {sec.course_code}
                      </span>
                      <CardTitle className="text-sm mt-0.5">{sec.course_name}</CardTitle>
                      <p className="text-xs text-slate-400">{sec.section_name}</p>
                    </div>
                    <Badge variant="default">{sec.enrolled_count} Enrolled</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSectionId(sec.id);
                        setSessionTitle(`${sec.course_code} Regular Class`);
                        setCreateModalOpen(true);
                      }}
                    >
                      <Play className="mr-1 h-3.5 w-3.5 text-primary-600" />
                      Take Attendance
                    </Button>
                    <Link href={`/teacher/reports?section=${sec.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs text-slate-500">
                        View Report
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sessions History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Attendance Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Course & Section</th>
                    <th className="pb-3 font-semibold">Title</th>
                    <th className="pb-3 font-semibold">Attendance</th>
                    <th className="pb-3 font-semibold">State</th>
                    <th className="pb-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sessions?.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 font-medium text-slate-700 dark:text-slate-300">
                        {s.session_date}
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {s.course_code}
                        </span>
                        <span className="block text-[10px] text-slate-500">{s.section_name}</span>
                      </td>
                      <td className="py-3 text-slate-700 dark:text-slate-300">{s.title}</td>
                      <td className="py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                        {s.present_count} / {s.enrolled_count}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            s.state === "ACTIVE"
                              ? "active"
                              : s.state === "PAUSED"
                              ? "paused"
                              : s.state === "COMPLETED"
                              ? "completed"
                              : "default"
                          }
                        >
                          {s.state}
                        </Badge>
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <Link href={`/teacher/sessions/${s.id}`}>
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {(!sessions || sessions.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No attendance sessions created yet. Click "Start Attendance Session" to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Start Session Modal */}
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Start Attendance Session"
          description="Create session and begin broadcasting dynamic QR codes"
        >
          <form onSubmit={handleCreateSession} className="space-y-4">
            {errorMsg && (
              <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-600 dark:bg-rose-950/40">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Course Section
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Select an assigned section...</option>
                {sections?.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.course_code} - {sec.course_name} ({sec.section_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Session Title / Topic
              </label>
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="e.g., Graph Algorithms Lecture #12"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                QR Rotation Rate (Seconds)
              </label>
              <select
                value={rotationInterval}
                onChange={(e) => setRotationInterval(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value={10}>10 Seconds (Recommended Default)</option>
                <option value={15}>15 Seconds</option>
                <option value={20}>20 Seconds</option>
                <option value={30}>30 Seconds</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-3">
              <Button variant="outline" type="button" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                <Play className="mr-1.5 h-4 w-4" />
                Launch Session
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
