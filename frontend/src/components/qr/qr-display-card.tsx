"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RotateCcw, Maximize2, Minimize2, ShieldCheck, Clock, Users, Clipboard, Check } from "lucide-react";

import { fetchApi } from "@/lib/api";
import { Button } from "../ui/button";

interface DynamicQRProps {
  sessionId: string;
  initialInterval?: number;
  livePresentCount?: number;
  totalEnrolled?: number;
}

interface ChallengeResponse {
  session_id: string;
  challenge_token: string;
  sequence: number;
  expires_in_seconds: number;
  qr_payload: string;
  is_active: boolean;
}


export function QRDisplayCard({
  sessionId,
  initialInterval = 10,
  livePresentCount = 0,
  totalEnrolled = 0,
}: DynamicQRProps) {
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(initialInterval);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!challenge?.qr_payload) return;
    navigator.clipboard.writeText(challenge.qr_payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  const fetchChallenge = async () => {
    try {
      setError(null);
      const data = await fetchApi<ChallengeResponse>(
        `/api/v1/qr/sessions/${sessionId}/challenge`
      );
      setChallenge(data);
      setSecondsLeft(data.expires_in_seconds || initialInterval);
    } catch (err: any) {
      setError(err.message || "Failed to generate QR challenge");
    }
  };

  // Initial load
  useEffect(() => {
    fetchChallenge();
  }, [sessionId]);

  // Countdown and rotation effect
  useEffect(() => {
    if (!challenge || !challenge.is_active) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          fetchChallenge();
          return initialInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [challenge, sessionId, initialInterval]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const progressPct = ((initialInterval - secondsLeft) / initialInterval) * 100;

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-8 text-white"
          : "flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      }
    >
      {/* Header Controls */}
      <div className="flex w-full items-center justify-between pb-4">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Dynamic Rotating QR</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rotates every {initialInterval}s (Challenge #{challenge?.sequence || 1})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchChallenge}
            disabled={loading}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Rotate
          </Button>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Live Attendee Counter Banner */}
      <div className="mb-4 flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Live Attendance:
          </span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {livePresentCount} / {totalEnrolled}
          </span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5 text-primary-500" />
          <span>Next in {secondsLeft}s</span>
        </div>
      </div>

      {/* Circular Progress Bar */}
      <div className="relative mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full bg-primary-600 transition-all duration-1000 ease-linear"
          style={{ width: `${100 - progressPct}%` }}
        />
      </div>

      {/* QR Code Container */}
      <div className="relative my-2 flex items-center justify-center rounded-2xl bg-white p-4 shadow-inner border border-slate-100">
        {challenge?.qr_payload ? (
          <QRCodeSVG
            value={challenge.qr_payload}
            size={isFullscreen ? 360 : 220}
            level="H"
            includeMargin={true}
          />
        ) : (
          <div
            className="flex items-center justify-center text-slate-400"
            style={{ width: 220, height: 220 }}
          >
            {error || "Generating secure challenge..."}
          </div>
        )}
      </div>

      {/* Copyable Challenge Code Helper */}
      {challenge?.qr_payload && (
        <div className="mt-2 flex w-full max-w-xs items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700">
          <span className="font-mono text-[11px] text-slate-500 truncate mr-2">
            Challenge #{challenge.sequence}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-primary-600 shadow-sm border border-slate-200 hover:bg-slate-50 dark:bg-slate-700 dark:text-primary-300 dark:border-slate-600"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                Copied
              </>
            ) : (
              <>
                <Clipboard className="h-3 w-3" />
                Copy Code
              </>
            )}
          </button>
        </div>
      )}

      {/* Instructions / Notice */}

      <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400 max-w-sm">
        Display this dynamic QR on the classroom projector. Students scan from their AttendX mobile app.
      </p>
    </div>
  );
}
