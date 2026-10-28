"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const router = useRouter();
  const { user, loading, isStudent, isTeacher, isDeptAdmin, isSuperAdmin } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (isStudent) {
      router.replace("/student");
    } else if (isTeacher) {
      router.replace("/teacher");
    } else if (isDeptAdmin) {
      router.replace("/dept-admin");
    } else if (isSuperAdmin) {
      router.replace("/super-admin");
    } else {
      router.replace("/login");
    }
  }, [user, loading, isStudent, isTeacher, isDeptAdmin, isSuperAdmin, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">Loading AttendX...</p>
      </div>
    </div>
  );
}
