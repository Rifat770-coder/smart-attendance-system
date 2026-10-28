"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Download,
  Info,
  Layers,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DeptAdminEnrollmentPage() {
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    enrolled_count: number;
    errors: string[];
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load sections
  const { data: sections = [] } = useQuery({
    queryKey: ["dept-sections-enrollment"],
    queryFn: () => fetchApi<any[]>("/api/v1/academic/sections"),
  });

  const handleDownloadSample = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "email,student_id\nstudent1@attendx.edu,STU-2024-001\nstudent2@attendx.edu,STU-2024-002\nstudent3@attendx.edu,STU-2024-003";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendx_sample_enrollment.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSectionId) {
      setErrorMsg("Please select a target course section.");
      return;
    }
    if (!file) {
      setErrorMsg("Please choose a CSV file to upload.");
      return;
    }

    try {
      setUploading(true);
      setErrorMsg(null);
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);

      // We make direct fetch with cookies for multipart
      const res = await fetch(
        `/api/v1/academic/sections/${selectedSectionId}/bulk-enroll-csv`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || "Bulk enrollment upload failed.");
      }

      setResult(json);
      setFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Bulk enrollment error.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Bulk Student Enrollment
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Batch enroll registered students into course section cohorts via CSV roster upload.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleDownloadSample}
            className="text-xs font-semibold"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Download Sample CSV
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary-600" />
                  Upload Enrollment Roster
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Target Course Section *
                    </label>
                    <select
                      required
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Choose a course section...</option>
                      {sections.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.course_code}: {s.course_name} — Section {s.section_name} ({s.enrolled_count}/{s.capacity} students)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Upload CSV File *
                    </label>
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-6 transition-colors hover:border-primary-500 dark:border-slate-700 dark:hover:border-primary-500">
                      <UploadCloud className="h-10 w-10 text-slate-400 mb-2" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {file ? file.name : "Drag and drop your CSV file here, or browse"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Only UTF-8 encoded .csv files are supported
                      </p>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="mt-3 text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={uploading}
                    className="w-full bg-primary-600 text-white hover:bg-primary-500 font-semibold shadow-md"
                  >
                    {uploading ? "Processing Roster..." : "Process Bulk Enrollment"}
                  </Button>
                </form>

                {/* Upload Results */}
                {result && (
                  <div className="mt-6 rounded-2xl bg-emerald-50/70 p-4 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span>{result.message}</span>
                    </div>

                    {result.errors.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800">
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-400">
                          Parsing Warnings ({result.errors.length}):
                        </span>
                        <ul className="mt-1 list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                          {result.errors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Guidelines Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary-600" />
                  Format Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                <p>
                  Your CSV file must include column headers in the first row. The parser looks for either:
                </p>
                <div className="rounded-lg bg-slate-100 p-2.5 font-mono text-[11px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  email,student_id
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>email:</strong> Student's official university email address.</li>
                  <li><strong>student_id:</strong> Roll number / student identifier.</li>
                  <li>Existing enrollments in the same section are skipped without error.</li>
                  <li>Students must be pre-registered in the university database.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
