"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, BookOpen } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StudentRoutinePage() {
  const { data: schedules } = useQuery({
    queryKey: ["student-schedules"],
    queryFn: () => fetchApi<any[]>("/api/v1/academic/schedules"),
  });

  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-primary-600" />
            Class Routine & Schedule
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Weekly class schedule, classroom locations, and timing.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {days.map((day) => {
            const daySchedules = schedules?.filter((s) => s.day_of_week === day) || [];
            return (
              <Card key={day}>
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">{day}</CardTitle>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {daySchedules.length} Classes
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-2.5">
                  {daySchedules.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/50"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                        <span className="flex items-center">
                          <Clock className="mr-1.5 h-3.5 w-3.5 text-primary-500" />
                          {s.start_time} - {s.end_time}
                        </span>
                        <Badge variant="default" className="text-[10px]">
                          {s.room_number}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        Section: Regular Lecture
                      </p>
                    </div>
                  ))}

                  {daySchedules.length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-400">
                      No classes scheduled.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
