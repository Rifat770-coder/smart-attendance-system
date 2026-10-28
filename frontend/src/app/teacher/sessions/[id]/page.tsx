"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  Pause,
  StopCircle,
  Users,
  CheckCircle2,
  Clock,
  ArrowLeft,
  UserPlus,
  Radio,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { QRDisplayCard } from "@/components/qr/qr-display-card";

export default function TeacherLiveSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [liveRecords, setLiveRecords] = useState<any[]>([]);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [manualStatus, setManualStatus] = useState("PRESENT");
  const [justification, setJustification] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Load session details
  const { data: session, refetch: refetchSession } = useQuery({
    queryKey: ["session-detail", sessionId],
    queryFn: () => fetchApi(`/api/v1/attendance/sessions/${sessionId}`),
  });

  // Load section enrolled students
  const { data: enrolledStudents } = useQuery({
    queryKey: ["section-students", session?.section_id],
    queryFn: () => fetchApi<any[]>(`/api/v1/academic/sections/${session?.section_id}/students`),
    enabled: !!session?.section_id,
  });

  // Initial load of records
  useEffect(() => {
    if (!sessionId) return;
    fetchApi<any[]>(`/api/v1/attendance/sessions/${sessionId}/records`).then((data) => {
      setLiveRecords(data);
    });
  }, [sessionId]);

  // Authenticated WebSocket connection for real-time live events
  useEffect(() => {
    if (!sessionId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/ws/sessions/${sessionId}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === "STUDENT_ATTENDANCE_MARKED") {
          const rec = payload.record;
          setLiveRecords((prev) => {
            const exists = prev.some((r) => r.student_id === rec.student_id);
            if (exists) return prev;
            return [rec, ...prev];
          });
          refetchSession();
        } else if (payload.event === "SESSION_STATE_CHANGED") {
          refetchSession();
        }
      } catch {}
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [sessionId, refetchSession]);

  const updateSessionState = async (newState: string) => {
    try {
      await fetchApi(`/api/v1/attendance/sessions/${sessionId}/state`, {
        method: "PATCH",
        body: JSON.stringify({ state: newState }),
      });
      refetchSession();
    } catch (err: any) {
      alert(err.message || "Failed to update session state.");
    }
  };

  const handleManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !justification.trim()) {
      alert("Please select a student and provide a justification.");
      return;
    }

    try {
      setSubmittingManual(true);
      const newRec = await fetchApi(`/api/v1/attendance/sessions/${sessionId}/manual-record`, {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          student_id: selectedStudentId,
          status: manualStatus,
          justification: justification.trim(),
        }),
      });

      setLiveRecords((prev) => [newRec, ...prev.filter((r) => r.student_id !== selectedStudentId)]);
      setManualModalOpen(false);
      setJustification("");
      setSelectedStudentId("");
      refetchSession();
    } catch (err: any) {
      alert(err.message || "Failed to mark manual record.");
    } finally {
      setSubmittingManual(false);
    }
  };

  const presentCount = liveRecords.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  const enrolledCount = session?.enrolled_count || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Navigation & Session Bar */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={() => router.push("/teacher")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {session?.course_code}: {session?.title}
                </h1>
                <Badge
                  variant={
                    session?.state === "ACTIVE"
                      ? "active"
                      : session?.state === "PAUSED"
                      ? "paused"
                      : session?.state === "COMPLETED"
                      ? "completed"
                      : "default"
                  }
                >
                  {session?.state}
                </Badge>
                {wsConnected && (
                  <span className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <Radio className="mr-1 h-3.5 w-3.5 animate-pulse" />
                    Live WS
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {session?.section_name} • {session?.session_date}
              </p>
            </div>
          </div>

          {/* Session State Action Buttons */}
          <div className="flex items-center space-x-2">
            {session?.state === "ACTIVE" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSessionState("PAUSED")}
                className="text-amber-600 border-amber-300 hover:bg-amber-50"
              >
                <Pause className="mr-1.5 h-4 w-4" />
                Pause
              </Button>
            )}

            {session?.state === "PAUSED" && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => updateSessionState("ACTIVE")}
              >
                <Play className="mr-1.5 h-4 w-4" />
                Resume
              </Button>
            )}

            {(session?.state === "ACTIVE" || session?.state === "PAUSED") && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm("End this attendance session? Students will no longer be able to scan.")) {
                    updateSessionState("COMPLETED");
                  }
                }}
              >
                <StopCircle className="mr-1.5 h-4 w-4" />
                End Session
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setManualModalOpen(true)}
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Manual Entry
            </Button>
          </div>
        </div>

        {/* Dynamic QR + Real-Time Live Feed */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Dynamic Rotating QR Component (5 columns) */}
          <div className="lg:col-span-5">
            {session?.state === "ACTIVE" ? (
              <QRDisplayCard
                sessionId={sessionId}
                initialInterval={session.rotation_interval_seconds || 10}
                livePresentCount={presentCount}
                totalEnrolled={enrolledCount}
              />
            ) : (
              <Card className="flex flex-col items-center justify-center p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <StopCircle className="h-8 w-8" />
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
                  QR Challenge Inactive
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">
                  This session is currently{" "}
                  <span className="font-semibold">{session?.state}</span>. QR code rotation only runs when the session is ACTIVE.
                </p>
                {session?.state === "PAUSED" && (
                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={() => updateSessionState("ACTIVE")}
                  >
                    Resume Session
                  </Button>
                )}
              </Card>
            )}
          </div>

          {/* Real-time Student Attendance Live List (7 columns) */}
          <div className="lg:col-span-7">
            <Card>
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center">
                    <Users className="mr-2 h-4 w-4 text-primary-600" />
                    Live Attendee Feed
                  </CardTitle>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {presentCount} of {enrolledCount} Present
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="max-h-[460px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                        <th className="pb-2.5 font-semibold">Student ID</th>
                        <th className="pb-2.5 font-semibold">Full Name</th>
                        <th className="pb-2.5 font-semibold">Method</th>
                        <th className="pb-2.5 font-semibold">Marked At</th>
                        <th className="pb-2.5 text-right font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {liveRecords.map((r) => (
                        <tr
                          key={r.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-2.5 font-mono font-medium text-slate-700 dark:text-slate-300">
                            {r.student_id_number}
                          </td>
                          <td className="py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                            {r.student_name}
                          </td>
                          <td className="py-2.5 text-slate-500">
                            {r.verification_method}
                          </td>
                          <td className="py-2.5 text-slate-500">
                            {new Date(r.verified_at).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 text-right">
                            <Badge
                              variant={
                                r.status === "PRESENT"
                                  ? "present"
                                  : r.status === "LATE"
                                  ? "late"
                                  : "absent"
                              }
                            >
                              {r.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}

                      {liveRecords.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            Awaiting student scans. The live list updates in real time over WebSocket.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Manual Attendance Entry Modal */}
        <Modal
          isOpen={manualModalOpen}
          onClose={() => setManualModalOpen(false)}
          title="Manual Attendance Override"
          description="Instructor override with required audit justification"
        >
          <form onSubmit={handleManualAttendance} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Student
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Select student...</option>
                {enrolledStudents?.map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.student_id_number} — {s.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Attendance Status
              </label>
              <select
                value={manualStatus}
                onChange={(e) => setManualStatus(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="PRESENT">PRESENT</option>
                <option value="LATE">LATE</option>
                <option value="EXCUSED">EXCUSED</option>
                <option value="ABSENT">ABSENT</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Justification (Recorded in Audit Log)
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="e.g. Student battery exhausted; physically confirmed in row 3"
                required
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3">
              <Button variant="outline" type="button" onClick={() => setManualModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submittingManual}>
                Record Override
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
