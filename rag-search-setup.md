# RAG Search — Project Setup Guide

## Overview

Mini project: Google-like search UI powered by RAG
ผู้ใช้ upload PDF → ระบบ index → ค้นหาด้วยภาษาธรรมชาติ → ได้คำตอบพร้อม source

---

## Tech Stack

| Layer | Tech | หน้าที่ |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Search UI |
| Backend | FastAPI (Python) | Orchestrator |
| Vector DB | ChromaDB | เก็บ embeddings |
| Embeddings | Gemini `text-embedding-004` | แปลง text → vector |
| LLM | Gemini 2.0 Flash | สร้างคำตอบ |

---

## Project Structure

```
rag-search/
├── frontend/                      # Next.js
│   ├── app/
│   │   ├── page.tsx               # หน้า search หลัก
│   │   ├── upload/
│   │   │   └── page.tsx           # หน้า upload PDF
│   │   └── layout.tsx
│   ├── components/
│   │   ├── SearchBar.tsx          # search input
│   │   ├── SearchResults.tsx      # แสดงผลลัพธ์
│   │   └── UploadZone.tsx         # drag & drop PDF
│   ├── lib/
│   │   └── api.ts                 # เรียก FastAPI
│   └── package.json
│
├── backend/                       # FastAPI
│   ├── main.py                    # entry point
│   ├── routers/
│   │   ├── upload.py              # POST /upload
│   │   └── search.py              # POST /search
│   ├── services/
│   │   ├── pdf_service.py         # อ่านและ chunk PDF
│   │   ├── embedding_service.py   # เรียก Gemini Embeddings
│   │   ├── chroma_service.py      # จัดการ ChromaDB
│   │   └── llm_service.py         # เรียก LLM สร้างคำตอบ
│   ├── models/
│   │   └── schemas.py             # Pydantic models
│   ├── chroma_data/               # ChromaDB local storage (gitignore)
│   ├── requirements.txt
│   └── .env
│
└── README.md
```

---

## API Endpoints

### `POST /upload`
รับไฟล์ PDF → chunk → embed → เก็บใน ChromaDB

**Request:** `multipart/form-data` — file

**Response:**
```json
{
  "status": "success",
  "doc_id": "uuid",
  "filename": "example.pdf",
  "chunks_count": 42
}
```

---

### `POST /search`
รับ query → embed → ค้นหาใน ChromaDB → ส่งให้ LLM → return คำตอบ

**Request:**
```json
{
  "query": "สรุปเนื้อหาเกี่ยวกับ...",
  "top_k": 5
}
```

**Response:**
```json
{
  "answer": "...",
  "sources": [
    {
      "filename": "example.pdf",
      "chunk_text": "...",
      "score": 0.87
    }
  ]
}
```

---

## Data Flow

### Phase 1 — Indexing
```
PDF upload
  → PyPDF2: อ่าน text
  → LangChain: ตัดเป็น chunks (500 tokens, overlap 50)
  → Gemini Embeddings (`text-embedding-004`): แปลงแต่ละ chunk เป็น vector
  → ChromaDB: เก็บ vector + metadata (filename, page, chunk_text)
```

### Phase 2 — Search
```
User query
  → Gemini Embeddings (`text-embedding-004`): แปลง query เป็น vector
  → ChromaDB: similarity search (top_k=5)
  → สร้าง prompt: context (chunks) + question
  → LLM: generate คำตอบ
  → ส่งกลับ: answer + source chunks
```

---

## Environment Variables

### Backend (`backend/.env`)
```
GEMINI_API_KEY=AIza...
CHROMA_PERSIST_DIR=./chroma_data
CHUNK_SIZE=500
CHUNK_OVERLAP=50
TOP_K=5
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Dependencies

### Backend (`requirements.txt`)
```
fastapi
uvicorn
python-multipart
pypdf2
langchain
langchain-google-genai
chromadb
google-generativeai
python-dotenv
pydantic
```

### Frontend (`package.json` — เพิ่มเติม)
```
next
react
react-dom
typescript
tailwindcss
```

---

## Run Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

---

## Pages

### `/` — Search Page
- Search bar ตรงกลาง (style คล้าย Google)
- แสดง results เป็น cards พร้อม source filename + snippet
- แสดง LLM answer ด้านบนสุด (answer box)

### `/upload` — Upload Page
- Drag & drop zone รับ PDF
- แสดง progress bar ตอน indexing
- แสดง list ของ documents ที่ index แล้ว

---

## Chunking Strategy

| Parameter | Value | เหตุผล |
|---|---|---|
| `chunk_size` | 500 tokens | พอดีกับ context window |
| `chunk_overlap` | 50 tokens | ไม่ให้ข้อมูลขาดตอนที่ขอบ chunk |
| `separator` | `\n\n` | แบ่งตาม paragraph ก่อน |

---

## Notes

- ChromaDB เก็บใน local disk (`chroma_data/`) ไม่ต้องสมัคร cloud
- Gemini มี free tier — `text-embedding-004` + `gemini-2.0-flash` ใช้ฟรีได้เลย
- API key ได้จาก [Google AI Studio](https://aistudio.google.com/apikey)
- ถ้าอยากทำ production ในอนาคต → เปลี่ยน ChromaDB เป็น pgvector (Supabase)
