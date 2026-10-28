"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, AlertCircle, CheckCircle, Clock, Download } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function StudentCoursesPage() {
  const { data: summary } = useQuery({
    queryKey: ["student-attendance-summary"],
    queryFn: () => fetchApi("/api/v1/reports/student/summary"),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
              <BookOpen className="mr-2 h-5 w-5 text-primary-600" />
              My Enrolled Courses & Attendance
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Review course-by-course attendance status and compliance thresholds.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {summary?.course_stats?.map((c: any) => (
            <Card key={c.course_id} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                      {c.course_code}
                    </span>
                    <CardTitle className="text-base mt-0.5">{c.course_name}</CardTitle>
                    <p className="text-xs text-slate-400">{c.section_name}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xl font-black ${
                        c.attendance_percentage >= 75
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {c.attendance_percentage}%
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      Req: {c.policy_minimum}%
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Present</span>
                    <span className="font-bold text-emerald-600">{c.present_sessions}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Late</span>
                    <span className="font-bold text-amber-600">{c.late_sessions}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Absent</span>
                    <span className="font-bold text-rose-600">{c.absent_sessions}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Total Held</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{c.eligible_sessions}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Attendance Rate</span>
                    <span>{c.attendance_percentage}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full ${
                        c.attendance_percentage >= 75 ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${c.attendance_percentage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
