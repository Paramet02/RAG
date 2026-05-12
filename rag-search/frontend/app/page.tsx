'use client'

import { useState } from "react";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import SearchResults from "@/components/SearchResults";
import { searchQuery, SearchResponse } from "@/lib/api";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: SearchResponse; query: string }
  | { status: "error"; message: string };

export default function HomePage() {
  const [state, setState] = useState<State>({ status: "idle" });

  async function handleSearch(query: string) {
    setState({ status: "loading" });
    try {
      const data = await searchQuery(query);
      setState({ status: "success", data, query });
    } catch (e: unknown) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด",
      });
    }
  }

  const isIdle = state.status === "idle";

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          RAG Search
        </span>
        <Link
          href="/upload"
          className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Upload PDF
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-12">
        {/* Search area */}
        <div className={`w-full max-w-2xl transition-all duration-300 ${isIdle ? "mt-24" : "mt-4"}`}>
          {isIdle && (
            <h1 className="mb-8 text-center text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              ค้นหาจากเอกสารของคุณ
            </h1>
          )}
          <SearchBar onSearch={handleSearch} loading={state.status === "loading"} />
        </div>

        {/* Results */}
        <div className="mt-8 w-full max-w-2xl">
          {state.status === "loading" && (
            <div className="flex flex-col items-center gap-3 py-16 text-zinc-400">
              <svg className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">กำลังค้นหา...</span>
            </div>
          )}

          {state.status === "error" && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {state.message}
            </div>
          )}

          {state.status === "success" && (
            <SearchResults results={state.data} query={state.query} />
          )}

          {isIdle && (
            <p className="mt-4 text-center text-sm text-zinc-400">
              ยังไม่มีเอกสาร?{" "}
              <Link href="/upload" className="text-blue-600 hover:underline dark:text-blue-400">
                Upload PDF ก่อนเลย
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
