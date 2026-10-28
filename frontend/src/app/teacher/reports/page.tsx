"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, FileSpreadsheet, FileBox } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TeacherReportsPage() {
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  // Load teacher sections
  const { data: sections } = useQuery({
    queryKey: ["teacher-sections"],
    queryFn: async () => {
      const data = await fetchApi<any[]>("/api/v1/academic/sections");
      if (data.length > 0 && !selectedSectionId) {
        setSelectedSectionId(data[0].id);
      }
      return data;
    },
  });

  // Load section matrix report
  const { data: report, isLoading } = useQuery({
    queryKey: ["section-report-matrix", selectedSectionId],
    queryFn: () => fetchApi(`/api/v1/reports/section/${selectedSectionId}`),
    enabled: !!selectedSectionId,
  });

  const downloadReport = (format: "csv" | "xlsx" | "pdf") => {
    if (!selectedSectionId) return;
    window.open(`/api/v1/reports/section/${selectedSectionId}/export?format=${format}`, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary-600" />
              Section Attendance Reports & Export
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Download official university attendance rosters and analytics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadReport("csv")}
              disabled={!selectedSectionId || isLoading}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadReport("xlsx")}
              disabled={!selectedSectionId || isLoading}
              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Excel (XLSX)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadReport("pdf")}
              disabled={!selectedSectionId || isLoading}
              className="text-rose-600 border-rose-300 hover:bg-rose-50"
            >
              <FileBox className="mr-1.5 h-3.5 w-3.5" />
              PDF Report
            </Button>
          </div>
        </div>

        {/* Section Selector */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Select Course Section:
          </label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {sections?.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.course_code} - {sec.course_name} ({sec.section_name})
              </option>
            ))}
          </select>
        </div>

        {/* Report Matrix Table */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">
                  {report?.course_code} {report?.course_name} — {report?.section_name}
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total Completed Sessions: {report?.total_sessions || 0}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                    <th className="pb-2.5 font-semibold">Student ID</th>
                    <th className="pb-2.5 font-semibold">Name</th>
                    <th className="pb-2.5 text-center font-semibold">Present</th>
                    <th className="pb-2.5 text-center font-semibold">Late</th>
                    <th className="pb-2.5 text-center font-semibold">Absent</th>
                    <th className="pb-2.5 text-center font-semibold">Excused</th>
                    <th className="pb-2.5 text-right font-semibold">Overall %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report?.students?.map((s: any) => (
                    <tr key={s.student_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 font-mono text-slate-700 dark:text-slate-300">
                        {s.student_id_number}
                      </td>
                      <td className="py-2.5 font-bold text-slate-900 dark:text-slate-100">
                        {s.student_name}
                      </td>
                      <td className="py-2.5 text-center font-semibold text-emerald-600">
                        {s.present}
                      </td>
                      <td className="py-2.5 text-center font-semibold text-amber-600">
                        {s.late}
                      </td>
                      <td className="py-2.5 text-center font-semibold text-rose-600">
                        {s.absent}
                      </td>
                      <td className="py-2.5 text-center font-semibold text-blue-600">
                        {s.excused}
                      </td>
                      <td className="py-2.5 text-right font-black">
                        <span
                          className={
                            s.percentage >= 75
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }
                        >
                          {s.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}

                  {(!report?.students || report.students.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No students enrolled or no completed sessions held yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
