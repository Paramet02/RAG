'use client'

import { useState, useCallback, DragEvent, ChangeEvent } from "react";
import { UploadResponse } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ProgressState =
  | { status: "idle" }
  | { status: "chunking"; filename: string }
  | { status: "embedding"; filename: string; current: number; total: number }
  | { status: "saving"; filename: string }
  | { status: "done" };

interface UploadedFile {
  response: UploadResponse;
}

export default function UploadZone() {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({ status: "idle" });
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const pdfs = Array.from(files).filter((f) => f.type === "application/pdf");
    if (!pdfs.length) {
      setError("กรุณาเลือกไฟล์ PDF เท่านั้น");
      return;
    }

    setError(null);

    const form = new FormData();
    for (const f of pdfs) form.append("files", f);

    setProgress({ status: "chunking", filename: pdfs[0].name });

    try {
      const res = await fetch(`${API_URL}/upload/stream`, {
        method: "POST",
        body: form,
      });

      if (!res.ok || !res.body) throw new Error("Upload failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const event = JSON.parse(line.slice(6));

          if (event.type === "error") {
            setError(event.error);
            setProgress({ status: "idle" });
            return;
          }
          if (event.type === "chunking") {
            setProgress({ status: "chunking", filename: event.filename });
          }
          if (event.type === "embedding") {
            setProgress({
              status: "embedding",
              filename: event.filename,
              current: event.current,
              total: event.total,
            });
          }
          if (event.type === "saving") {
            setProgress({ status: "saving", filename: event.filename });
          }
          if (event.type === "done") {
            setUploaded((prev) => [
              ...prev,
              {
                response: {
                  status: "success",
                  doc_id: event.doc_id,
                  filename: event.filename,
                  chunks_count: event.chunks_count,
                },
              },
            ]);
          }
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setProgress({ status: "idle" });
    }
  }, []);

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  function onFileInput(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = "";
  }

  const busy = progress.status !== "idle";

  return (
    <div className="w-full space-y-6">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
          dragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
            : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
        }`}
      >
        <input
          type="file"
          accept="application/pdf"
          multiple
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={onFileInput}
          disabled={busy}
        />

        {busy ? (
          <ProgressDisplay progress={progress} />
        ) : (
          <>
            <svg
              className={`mb-4 h-12 w-12 ${dragging ? "text-blue-500" : "text-zinc-400"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16v-8m0 0-3 3m3-3 3 3M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1"
              />
            </svg>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              ลาก PDF มาวางที่นี่ หรือ{" "}
              <span className="text-blue-600 dark:text-blue-400">คลิกเพื่อเลือกไฟล์</span>
            </p>
            <p className="mt-1 text-xs text-zinc-400">รองรับ PDF เท่านั้น ขนาดไม่เกิน 50 MB ต่อไฟล์</p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Uploaded list */}
      {uploaded.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            เอกสารที่ index แล้ว ({uploaded.length})
          </h2>
          <div className="space-y-2">
            {uploaded.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <svg className="h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
                  </svg>
                  <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                    {item.response.filename}
                  </span>
                </div>
                <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  {item.response.chunks_count} chunks
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressDisplay({ progress }: { progress: ProgressState }) {
  if (progress.status === "idle") return null;

  const steps = ["chunking", "embedding", "saving"] as const;
  const currentStep = progress.status === "done" ? "saving" : progress.status;
  const stepIndex = steps.indexOf(currentStep);

  const labels: Record<typeof steps[number], string> = {
    chunking: "กำลังอ่าน PDF",
    embedding: "กำลัง Embedding",
    saving: "กำลังบันทึก",
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <svg className="h-8 w-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-xs">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className={`flex items-center gap-1 font-medium ${
              i < stepIndex
                ? "text-green-600 dark:text-green-400"
                : i === stepIndex
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-400"
            }`}>
              {i < stepIndex ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] font-bold ${
                  i === stepIndex ? "bg-blue-600 text-white" : "bg-zinc-300 text-zinc-500"
                }`}>
                  {i + 1}
                </span>
              )}
              {labels[step]}
            </div>
            {i < steps.length - 1 && <span className="text-zinc-300">›</span>}
          </div>
        ))}
      </div>

      {/* Embedding progress bar */}
      {progress.status === "embedding" && (
        <div className="w-full max-w-xs space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <p className="text-center text-xs text-zinc-500">
            {progress.current} / {progress.total} chunks
          </p>
        </div>
      )}

      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {progress.status === "chunking" && `กำลังอ่านและตัด "${progress.filename}"...`}
        {progress.status === "embedding" && `Embedding "${progress.filename}"...`}
        {progress.status === "saving" && `บันทึกลง ChromaDB...`}
      </p>
    </div>
  );
}
