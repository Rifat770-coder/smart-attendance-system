"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Plus,
  Users,
  GraduationCap,
  Layers,
  ChevronRight,
  Search,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

export default function DeptAdminCoursesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [createSectionOpen, setCreateSectionOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any | null>(null);

  // Form states - Course
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCredits, setCourseCredits] = useState(3.0);
  const [courseDesc, setCourseDesc] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");

  // Form states - Section
  const [targetCourseId, setTargetCourseId] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [capacity, setCapacity] = useState(50);

  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: departments = [] } = useQuery({
    queryKey: ["dept-list"],
    queryFn: () => fetchApi<any[]>("/api/v1/academic/departments"),
  });

  const { data: semesters = [] } = useQuery({
    queryKey: ["semesters-list"],
    queryFn: () => fetchApi<any[]>("/api/v1/academic/semesters"),
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["dept-courses-list"],
    queryFn: () => fetchApi<any[]>("/api/v1/academic/courses"),
  });

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["dept-sections-list"],
    queryFn: () => fetchApi<any[]>("/api/v1/academic/sections"),
  });

  // Query section students when viewing modal
  const { data: sectionStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["section-students", selectedSection?.id],
    queryFn: () =>
      selectedSection
        ? fetchApi<any[]>(`/api/v1/academic/sections/${selectedSection.id}/students`)
        : Promise.resolve([]),
    enabled: !!selectedSection,
  });

  // Create Course Mutation
  const createCourseMutation = useMutation({
    mutationFn: async () => {
      const deptId = departments[0]?.id;
      if (!deptId) throw new Error("No department configured.");
      return fetchApi("/api/v1/academic/courses", {
        method: "POST",
        body: JSON.stringify({
          department_id: deptId,
          semester_id: selectedSemesterId || semesters[0]?.id,
          code: courseCode.trim().toUpperCase(),
          name: courseName.trim(),
          credits: courseCredits,
          description: courseDesc.trim() || undefined,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dept-courses-list"] });
      setCreateCourseOpen(false);
      setCourseCode("");
      setCourseName("");
      setCourseDesc("");
      setFormError(null);
    },
    onError: (err: any) => setFormError(err.message || "Failed to create course."),
  });

  // Create Section Mutation
  const createSectionMutation = useMutation({
    mutationFn: async () => {
      return fetchApi("/api/v1/academic/sections", {
        method: "POST",
        body: JSON.stringify({
          course_id: targetCourseId,
          semester_id: selectedSemesterId || semesters[0]?.id,
          section_name: sectionName.trim(),
          capacity: capacity,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dept-sections-list"] });
      setCreateSectionOpen(false);
      setSectionName("");
      setFormError(null);
    },
    onError: (err: any) => setFormError(err.message || "Failed to create section."),
  });

  const filteredSections = sections.filter((s: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.course_code?.toLowerCase().includes(term) ||
      s.course_name?.toLowerCase().includes(term) ||
      s.section_name?.toLowerCase().includes(term)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Course Sections & Curriculum
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage academic courses, section divisions, and student enrollment caps.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFormError(null);
                setCreateCourseOpen(true);
              }}
              className="text-xs font-semibold"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Course
            </Button>
            <Button
              onClick={() => {
                setFormError(null);
                setTargetCourseId(courses[0]?.id || "");
                setCreateSectionOpen(true);
              }}
              className="bg-primary-600 text-white hover:bg-primary-500 text-xs font-semibold shadow-md"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Section
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by course code, title, or section name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* Sections Grid */}
        {sectionsLoading ? (
          <div className="py-12 text-center text-slate-500">Loading course sections...</div>
        ) : filteredSections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                No course sections found
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Add your curriculum courses and create section cohorts to enroll students.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSections.map((sec: any) => {
              const fillPercentage = Math.round(
                ((sec.enrolled_count || 0) / (sec.capacity || 50)) * 100
              );
              return (
                <Card
                  key={sec.id}
                  className="flex flex-col justify-between transition-all hover:shadow-md border border-slate-200 dark:border-slate-800"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                        {sec.course_code}
                      </span>
                      <Badge variant="default">Section {sec.section_name}</Badge>
                    </div>
                    <CardTitle className="mt-2 text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                      {sec.course_name}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Enrollment: {sec.enrolled_count} / {sec.capacity}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {fillPercentage}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${
                            fillPercentage > 90 ? "bg-amber-500" : "bg-primary-600"
                          }`}
                          style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSection(sec)}
                        className="w-full text-xs font-semibold justify-center"
                      >
                        <Users className="mr-1.5 h-3.5 w-3.5" />
                        View Enrolled Students ({sec.enrolled_count})
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal: Add Course */}
        <Modal
          isOpen={createCourseOpen}
          onClose={() => setCreateCourseOpen(false)}
          title="Add Academic Course"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCourseMutation.mutate();
            }}
            className="space-y-4"
          >
            {formError && (
              <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS103"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Credit Hours *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="6"
                  required
                  value={courseCredits}
                  onChange={(e) => setCourseCredits(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Course Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Algorithms & Complexity"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Academic Semester
              </label>
              <select
                value={selectedSemesterId}
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {semesters.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.academic_year_name || "Current Year"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
                placeholder="Brief curriculum overview..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateCourseOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCourseMutation.isPending}
                className="bg-primary-600 text-white hover:bg-primary-500"
              >
                {createCourseMutation.isPending ? "Adding..." : "Add Course"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Create Section */}
        <Modal
          isOpen={createSectionOpen}
          onClose={() => setCreateSectionOpen(false)}
          title="Create Course Section"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createSectionMutation.mutate();
            }}
            className="space-y-4"
          >
            {formError && (
              <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Parent Course *
              </label>
              <select
                required
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.code}: {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Section Code / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Section B"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student Capacity *
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateSectionOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSectionMutation.isPending}
                className="bg-primary-600 text-white hover:bg-primary-500"
              >
                {createSectionMutation.isPending ? "Creating..." : "Create Section"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: View Enrolled Students */}
        <Modal
          isOpen={!!selectedSection}
          onClose={() => setSelectedSection(null)}
          title={`Enrolled Students — ${selectedSection?.course_code} (${selectedSection?.section_name})`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 border-b pb-2 dark:border-slate-800">
              <span>{selectedSection?.course_name}</span>
              <span>{sectionStudents.length} Students Enrolled</span>
            </div>

            {studentsLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Loading enrolled students...
              </div>
            ) : sectionStudents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No students enrolled in this section yet.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {sectionStudents.map((st: any) => (
                  <div key={st.student_id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {st.full_name}
                      </div>
                      <div className="text-slate-400 text-[11px]">{st.email}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        {st.student_id_number}
                      </span>
                      <div className="text-[10px] text-slate-400">{st.batch_name || "CSE Batch"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedSection(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
