"use client";

import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Camera,
  Upload,
  Keyboard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileImage,
  Clipboard,
  ShieldCheck,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QRScannerModal({
  isOpen,
  onClose,
  onSuccess,
}: QRScannerModalProps) {
  const [mode, setMode] = useState<"camera" | "upload" | "manual">("camera");
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);

  // Manual entry states
  const [manualPayload, setManualPayload] = useState("");
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [manualToken, setManualToken] = useState("");

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerId = "attendx-qr-reader";

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setScanResult(null);
      setErrorMessage(null);
      setCameraUnavailable(false);
      setManualPayload("");
      return;
    }

    // Load active sessions for manual option
    fetchApi<any[]>("/api/v1/attendance/sessions?state=ACTIVE")
      .then((data) => {
        setActiveSessions(data || []);
        if (data && data.length > 0) {
          setSelectedSessionId(data[0].id);
        }
      })
      .catch(() => {});

    if (mode === "camera") {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, mode]);

  const startScanner = async () => {
    try {
      setErrorMessage(null);
      setCameraUnavailable(false);
      setScanning(true);

      // Clean up previous instance if any
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          await html5QrCodeRef.current.clear();
        } catch {}
      }

      // Check if getUserMedia is supported in this browser/webview context
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Camera API is not supported in this browser or preview context."
        );
      }

      const qrScanner = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          await handleScannedPayload(decodedText);
        },
        () => {
          // Frame parse error ignored
        }
      );
    } catch (err: any) {
      setScanning(false);
      setCameraUnavailable(true);
      setErrorMessage(
        "Camera access is restricted or not permitted in this preview environment. You can upload an image or enter the session code directly below."
      );
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  const handleScannedPayload = async (payload: string) => {
    if (submitting) return;

    const trimmed = payload.trim();
    if (!trimmed.startsWith("ATTENDX:")) {
      setErrorMessage("Scanned QR code is not a valid AttendX session challenge.");
      return;
    }

    const parts = trimmed.split(":");
    if (parts.length < 4) {
      setErrorMessage("Corrupted AttendX QR code format.");
      return;
    }

    const sessionId = parts[1];
    const challengeToken = parts[3];

    await submitAttendance(sessionId, challengeToken);
  };

  const submitAttendance = async (sessionId: string, challengeToken: string) => {
    try {
      setSubmitting(true);
      setErrorMessage(null);
      await stopScanner();

      const res = await fetchApi("/api/v1/qr/scan", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId.trim(),
          challenge_token: challengeToken.trim(),
          client_timestamp: new Date().toISOString(),
        }),
      });

      setScanResult(res);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);

      // Create scanner instance for file scanning
      const qrScanner = html5QrCodeRef.current || new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = qrScanner;

      const decodedText = await qrScanner.scanFile(file, true);
      await handleScannedPayload(decodedText);
    } catch (err: any) {
      setErrorMessage(
        "Could not detect a valid AttendX QR code in the uploaded image. Please ensure the QR code is clearly visible or use manual code entry."
      );
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (manualPayload.trim().startsWith("ATTENDX:")) {
      await handleScannedPayload(manualPayload.trim());
      return;
    }

    if (!selectedSessionId) {
      setErrorMessage("Please select an active session.");
      return;
    }

    if (!manualToken.trim()) {
      setErrorMessage("Please enter the challenge token.");
      return;
    }

    await submitAttendance(selectedSessionId, manualToken.trim());
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setManualPayload(text);
        if (text.startsWith("ATTENDX:")) {
          handleScannedPayload(text);
        }
      }
    } catch {
      // Clipboard read may be blocked by browser permissions
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Attendance"
      description="Scan rotating QR, upload photo, or enter session challenge"
    >
      <div className="flex flex-col items-center">
        {/* Navigation Mode Tabs */}
        {!scanResult && (
          <div className="mb-4 flex w-full items-center justify-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode("camera");
                setErrorMessage(null);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                mode === "camera"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              Camera
            </button>
            <button
              type="button"
              onClick={() => {
                stopScanner();
                setMode("upload");
                setErrorMessage(null);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                mode === "upload"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Image
            </button>
            <button
              type="button"
              onClick={() => {
                stopScanner();
                setMode("manual");
                setErrorMessage(null);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                mode === "manual"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Keyboard className="h-3.5 w-3.5" />
              Enter Code
            </button>
          </div>
        )}

        {/* Hidden Container for Html5Qrcode initialization */}
        <div id={scannerContainerId} className={mode === "camera" && !cameraUnavailable ? "w-full max-w-sm rounded-2xl overflow-hidden mb-3" : "hidden"} />

        {/* Mode 1: Camera Viewport */}
        {mode === "camera" && !scanResult && (
          <div className="w-full">
            {cameraUnavailable ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
                <AlertCircle className="mx-auto h-8 w-8 text-amber-600 mb-2" />
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Camera Access Unavailable
                </h4>
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                  Your device browser/preview has blocked camera permissions. Choose an alternative:
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs font-semibold"
                    onClick={() => {
                      stopScanner();
                      setMode("upload");
                      setErrorMessage(null);
                    }}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Upload QR Photo
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-primary-600 text-white hover:bg-primary-500 text-xs font-semibold"
                    onClick={() => {
                      stopScanner();
                      setMode("manual");
                      setErrorMessage(null);
                    }}
                  >
                    <Keyboard className="mr-1.5 h-3.5 w-3.5" />
                    Enter Code Manually
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-black">
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-56 w-56 rounded-2xl border-2 border-primary-500 border-dashed animate-pulse" />
                  </div>
                )}
                {submitting && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary-400 mb-2" />
                    <p className="text-xs font-medium">Verifying dynamic challenge...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mode 2: Upload / Photo Capture */}
        {mode === "upload" && !scanResult && (
          <div className="w-full space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center transition-colors hover:border-primary-500 dark:border-slate-700 dark:hover:border-primary-500 bg-slate-50 dark:bg-slate-800/40"
            >
              <FileImage className="h-10 w-10 text-primary-600 mb-2" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Tap to Select QR Image or Take Photo
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Accepts PNG, JPG, or camera screenshots
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {submitting && (
              <div className="flex items-center justify-center gap-2 text-xs text-primary-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Decoding and verifying QR token...</span>
              </div>
            )}
          </div>
        )}

        {/* Mode 3: Manual Code / Token Entry */}
        {mode === "manual" && !scanResult && (
          <form onSubmit={handleManualSubmit} className="w-full space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full QR String or Challenge Token *
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="text-[11px] text-primary-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <Clipboard className="h-3 w-3" />
                  Paste
                </button>
              </div>
              <input
                type="text"
                required
                value={manualPayload}
                onChange={(e) => setManualPayload(e.target.value)}
                placeholder="e.g. ATTENDX:session_id:1:token or challenge token"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* If payload doesn't contain ATTENDX prefix, show session selector */}
            {!manualPayload.startsWith("ATTENDX:") && activeSessions.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Active Course Session
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-medium focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {activeSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.course_code}: {s.course_name} — {s.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || (!manualPayload.trim() && !manualToken.trim())}
              className="w-full bg-primary-600 text-white hover:bg-primary-500 text-xs font-bold py-2.5 shadow-md"
            >
              {submitting ? "Verifying..." : "Submit Attendance"}
            </Button>
          </form>
        )}

        {/* Success View */}
        {scanResult && (
          <div className="my-4 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">
              Attendance Recorded!
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Status:{" "}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {scanResult.status}
              </span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Marked at: {new Date(scanResult.verified_at).toLocaleTimeString()}
            </p>
            <Button className="mt-6 w-full font-semibold" onClick={onClose}>
              Done
            </Button>
          </div>
        )}

        {/* Error View */}
        {errorMessage && !scanResult && (
          <div className="mt-3 w-full rounded-xl bg-rose-50 p-3 text-center border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
            <p className="font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Security Notice */}
        {!scanResult && (
          <p className="mt-4 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-500 inline" />
            Cryptographically rotating challenges expire within 15 seconds.
          </p>
        )}
      </div>
    </Modal>
  );
}
