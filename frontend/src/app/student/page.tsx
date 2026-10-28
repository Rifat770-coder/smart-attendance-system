"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  QrCode,
  AlertTriangle,
  CheckCircle,
  Clock,
  BookOpen,
  Calendar,
  FileQuestion,
  TrendingUp,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRScannerModal } from "@/components/qr/qr-scanner-modal";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [scannerOpen, setScannerOpen] = useState(false);

  // Load calculated attendance summary
  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ["student-attendance-summary"],
    queryFn: () => fetchApi("/api/v1/reports/student/summary"),
  });

  // Load schedules
  const { data: schedules } = useQuery({
    queryKey: ["student-schedules"],
    queryFn: () => fetchApi<any[]>("/api/v1/academic/schedules"),
  });

  const overallPct = summary?.overall_percentage ?? 100.0;
  const isLowAttendance = overallPct < 75.0 && (summary?.total_eligible_sessions || 0) > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome & Action Banner */}
        <div className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-primary-600 to-indigo-700 p-6 text-white shadow-lg sm:flex-row sm:items-center">
          <div>
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
              Student Portal
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Welcome back, {user?.full_name?.split(" ")[0]}!
            </h1>
            <p className="mt-1 text-xs text-primary-100 sm:text-sm">
              ID: {user?.student_profile?.student_id_number} | Computer Science & Engineering
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => setScannerOpen(true)}
            className="bg-white text-primary-700 hover:bg-primary-50 shadow-md font-bold sm:self-auto"
          >
            <QrCode className="mr-2 h-5 w-5 text-primary-600" />
            Scan Classroom QR
          </Button>
        </div>

        {/* Low Attendance Warning Alert */}
        {isLowAttendance && (
          <div className="flex items-center space-x-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="h-6 w-6 flex-shrink-0 text-amber-600" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold">Low Attendance Alert: </span>
              Your overall attendance is currently {overallPct}%, which is below the mandatory 75% university requirement.
            </div>
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Overall Attendance</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                    {overallPct}%
                  </p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  overallPct >= 75 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                }`}>
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full ${overallPct >= 75 ? "bg-emerald-500" : "bg-rose-500"}`}
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Classes Attended</p>
                  <p className="mt-1 text-2xl font-black text-emerald-600">
                    {summary?.total_present ?? 0}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Total eligible: {summary?.total_eligible_sessions ?? 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Late Attendances</p>
                  <p className="mt-1 text-2xl font-black text-amber-600">
                    {summary?.total_late ?? 0}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">Weighted at 0.5x credit</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Excused Sessions</p>
                  <p className="mt-1 text-2xl font-black text-blue-600">
                    {summary?.total_excused ?? 0}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileQuestion className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">Medical or sanctioned leave</p>
            </CardContent>
          </Card>
        </div>

        {/* Enrolled Courses & Attendance Percentage */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center">
                <BookOpen className="mr-2 h-4 w-4 text-primary-600" />
                Course Attendance Breakdown
              </h2>
            </div>

            <div className="space-y-3">
              {summary?.course_stats?.map((course: any) => (
                <Card key={course.course_id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {course.course_code}
                          </span>
                          <span className="text-xs text-slate-500">• {course.section_name}</span>
                        </div>
                        <h4 className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {course.course_name}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-black ${
                          course.attendance_percentage >= 75
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {course.attendance_percentage}%
                        </span>
                        <p className="text-[10px] text-slate-400">Min 75% req.</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>Present: {course.present_sessions}</span>
                      <span>Late: {course.late_sessions}</span>
                      <span>Absent: {course.absent_sessions}</span>
                      <span>Held: {course.eligible_sessions}</span>
                    </div>

                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full ${
                          course.attendance_percentage >= 75 ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${course.attendance_percentage}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!summary?.course_stats || summary.course_stats.length === 0) && (
                <Card>
                  <CardContent className="py-8 text-center text-xs text-slate-400">
                    No active course enrollments found.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Class Routine / Timetable */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center">
              <Calendar className="mr-2 h-4 w-4 text-primary-600" />
              Weekly Routine
            </h2>

            <Card>
              <CardContent className="p-4 space-y-3">
                {schedules?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                        {item.day_of_week}
                      </span>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {item.start_time} - {item.end_time}
                      </p>
                    </div>
                    <Badge variant="default" className="text-[10px]">
                      {item.room_number}
                    </Badge>
                  </div>
                ))}

                {(!schedules || schedules.length === 0) && (
                  <p className="py-6 text-center text-xs text-slate-400">
                    No scheduled routine for today.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Scanner Modal */}
        <QRScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onSuccess={() => refetchSummary()}
        />
      </div>
    </DashboardLayout>
  );
}
