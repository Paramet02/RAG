const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SourceChunk {
  filename: string;
  chunk_text: string;
  score: number;
}

export interface SearchResponse {
  answer: string;
  sources: SourceChunk[];
}

export interface UploadResponse {
  status: string;
  doc_id: string;
  filename: string;
  chunks_count: number;
}

export async function searchQuery(
  query: string,
  top_k = 5
): Promise<SearchResponse> {
  const res = await fetch(`${API_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Search failed");
  }

  return res.json();
}

export async function uploadFiles(files: File[]): Promise<UploadResponse[]> {
  const results: UploadResponse[] = [];

  for (const file of files) {
    const form = new FormData();
    form.append("files", file);

    const res = await fetch(`${API_URL}/upload`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Upload failed: ${file.name}`);
    }

    const data = await res.json();
    // backend returns single object or array depending on file count
    results.push(Array.isArray(data) ? data[0] : data);
  }

  return results;
}
