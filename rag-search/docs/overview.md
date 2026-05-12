# RAG Search — Project Overview

## What is this?

Mini project: Google-like search UI powered by RAG (Retrieval-Augmented Generation)

- ผู้ใช้ **upload PDF** → ระบบ **index** → **ค้นหาด้วยภาษาธรรมชาติ** → ได้ **คำตอบพร้อม source**

---

## Tech Stack

| Layer | Tech | หน้าที่ |
|---|---|---|
| Frontend | Next.js 16 (App Router) + Tailwind CSS | Search UI |
| Backend | FastAPI (Python) | Orchestrator / API |
| Vector DB | ChromaDB (local) | เก็บ embeddings |
| Embeddings | Gemini `text-embedding-004` | แปลง text → vector |
| LLM | Gemini 2.0 Flash | สร้างคำตอบ |

---

## Project Structure

```
rag-search/
├── docs/                          # documentation (here)
├── frontend/                      # Next.js 16
│   ├── app/
│   │   ├── page.tsx               # หน้า search หลัก
│   │   ├── upload/page.tsx        # หน้า upload PDF
│   │   └── layout.tsx
│   ├── components/
│   │   ├── SearchBar.tsx
│   │   ├── SearchResults.tsx
│   │   └── UploadZone.tsx
│   ├── lib/
│   │   └── api.ts                 # เรียก FastAPI
│   └── .env.local
│
├── backend/                       # FastAPI + uv
│   ├── main.py
│   ├── routers/
│   │   ├── upload.py              # POST /upload
│   │   └── search.py              # POST /search
│   ├── services/
│   │   ├── pdf_service.py
│   │   ├── embedding_service.py
│   │   ├── chroma_service.py
│   │   └── llm_service.py
│   ├── models/schemas.py
│   ├── chroma_data/               # ChromaDB local storage (gitignored)
│   ├── pyproject.toml
│   └── .env
│
└── .gitignore
```

---

## Data Flow

### Phase 1 — Indexing (Upload)

```
PDF upload
  → PyPDF2: อ่าน text ทีละ page
  → LangChain RecursiveCharacterTextSplitter: chunk_size=500, overlap=50
  → Gemini text-embedding-004: แปลงแต่ละ chunk เป็น vector (768 dims)
  → ChromaDB: persist vector + metadata (filename, page, chunk_text)
```

### Phase 2 — Search

```
User query
  → Gemini text-embedding-004: embed query
  → ChromaDB: similarity search (cosine), top_k=5
  → Build prompt: context chunks + question
  → Gemini 2.0 Flash: generate answer
  → Response: { answer, sources[] }
```

---

## API Reference

### `POST /upload`
| Field | Type | Description |
|---|---|---|
| file | multipart/form-data | PDF file |

**Response:**
```json
{
  "status": "success",
  "doc_id": "uuid",
  "filename": "example.pdf",
  "chunks_count": 42
}
```

### `POST /search`
```json
// Request
{ "query": "สรุปเนื้อหาเกี่ยวกับ...", "top_k": 5 }

// Response
{
  "answer": "...",
  "sources": [
    { "filename": "example.pdf", "chunk_text": "...", "score": 0.87 }
  ]
}
```

---

## Environment Variables

### Backend (`backend/.env`)
```env
GEMINI_API_KEY=AIza...
CHROMA_PERSIST_DIR=./chroma_data
CHUNK_SIZE=500
CHUNK_OVERLAP=50
TOP_K=5
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Run Locally

```bash
# Backend
cd backend
uv run uvicorn main:app --reload --port 8000

# Frontend
cd frontend
pnpm dev
```
