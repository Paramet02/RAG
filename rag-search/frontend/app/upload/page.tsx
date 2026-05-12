import Link from "next/link";
import UploadZone from "@/components/UploadZone";

export default function UploadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <Link
          href="/"
          className="text-lg font-semibold text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
        >
          RAG Search
        </Link>
        <Link
          href="/"
          className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ไปค้นหา
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Upload เอกสาร
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              อัปโหลด PDF เพื่อให้ระบบ index และนำไปค้นหาด้วย AI
            </p>
          </div>
          <UploadZone />
        </div>
      </main>
    </div>
  );
}
