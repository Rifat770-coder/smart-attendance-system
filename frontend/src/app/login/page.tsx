"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await login(email, password);

      const roles = user.roles || [];
      if (roles.includes("STUDENT")) router.replace("/student");
      else if (roles.includes("TEACHER")) router.replace("/teacher");
      else if (roles.includes("DEPT_ADMIN")) router.replace("/dept-admin");
      else if (roles.includes("SUPER_ADMIN")) router.replace("/super-admin");
      else router.replace("/");
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary-50 via-transparent to-primary-100/30 dark:from-slate-950 dark:to-primary-950/20 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-xl shadow-primary-500/25">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Attend<span className="text-primary-600">X</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Smart University Attendance Management Platform
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Sign In to Your Account
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Enter your university credentials to continue
          </p>

          {error && (
            <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Institutional Email
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@attendx.edu"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="mt-2 w-full font-semibold"
            >
              <span>Authenticate</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Quick Role Login (Pre-Seeded)
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoCredentials("teacher@attendx.edu", "Teacher@123456")}
                className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Teacher
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials("student1@attendx.edu", "Student@123456")}
                className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Student 1
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials("deptadmin@attendx.edu", "DeptAdmin@123456")}
                className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Dept Admin
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials("superadmin@attendx.edu", "Admin@123456")}
                className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Super Admin
              </button>
            </div>
          </div>
        </div>

        {/* Security Assurance footer */}
        <div className="mt-4 flex items-center justify-center space-x-2 text-[11px] text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Secured with Argon2id & Server-Side HttpOnly Sessions</span>
        </div>
      </div>
    </div>
  );
}
