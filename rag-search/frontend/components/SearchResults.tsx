'use client'

import { SearchResponse } from "@/lib/api";

interface SearchResultsProps {
  results: SearchResponse;
  query: string;
}

export default function SearchResults({ results, query }: SearchResultsProps) {
  return (
    <div className="w-full space-y-6">
      {/* Answer box */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/40">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.636 6.364l.707-.707M12 21v-1m-6.364-1.636l.707-.707M15.536 8.464a5 5 0 1 1-7.072 7.072" />
          </svg>
          คำตอบจาก AI
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
          {results.answer}
        </p>
      </div>

      {/* Source chunks */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          แหล่งที่มา ({results.sources.length} รายการ)
        </h2>
        <div className="space-y-3">
          {results.sources.map((source, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="h-4 w-4 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
                  </svg>
                  <span className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {source.filename}
                  </span>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  source.score >= 0.8
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                    : source.score >= 0.6
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}>
                  {(source.score * 100).toFixed(0)}% match
                </span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-600 line-clamp-4 dark:text-zinc-400">
                {highlight(source.chunk_text, query)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// highlight matching words in chunk text
function highlight(text: string, query: string) {
  if (!query) return text;
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return text;

  const regex = new RegExp(`(${words.map(escape).join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-700 dark:text-white">
        {part}
      </mark>
    ) : part
  );
}

function escape(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
