# RAG Search

Google-like search UI powered by RAG — upload PDF แล้วค้นหาด้วยภาษาธรรมชาติ ได้คำตอบพร้อม source

## Architecture

```
PDF upload
  → PyPDF2: อ่าน text
  → LangChain RecursiveCharacterTextSplitter (chunk 500 tokens, overlap 50)
  → Gemini Embeddings (gemini-embedding-001): แปลงแต่ละ chunk เป็น vector
  → ChromaDB: เก็บ vector + metadata

User query
  → Gemini Embeddings: แปลง query เป็น vector
  → ChromaDB: similarity search (top_k=5)
  → Gemini 2.0 Flash: สร้างคำตอบจาก context
  → ส่งกลับ: answer + source chunks
```

**Stack**

| Layer      | Tech                          |
|------------|-------------------------------|
| Frontend   | Next.js 16 (App Router)       |
| Backend    | FastAPI (Python)              |
| Vector DB  | ChromaDB (local disk)         |
| Embeddings | Gemini `gemini-embedding-001` |
| LLM        | Gemini 2.0 Flash              |

## Prerequisites

- Python 3.12+
- Node.js 18+ / pnpm
- Gemini API key — ขอได้ฟรีที่ [Google AI Studio](https://aistudio.google.com/apikey)

## Run Locally

### 1. Backend

```bash
cd backend

# สร้าง .env
cp .env.example .env
# แก้ GEMINI_API_KEY ใน .env

# ติดตั้ง dependencies (แนะนำ uv)
uv sync
# หรือ pip
pip install -r requirements.txt

# รัน
uv run uvicorn main:app --reload --port 8000
# หรือ
uvicorn main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend

# สร้าง .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

pnpm install
pnpm dev
```

UI: http://localhost:3000

## Run with Docker

```bash
# copy .env
cp backend/.env.example backend/.env
# แก้ GEMINI_API_KEY ใน backend/.env

docker compose up --build
```

| Service  | URL                      |
|----------|--------------------------|
| Frontend | http://localhost:3000    |
| Backend  | http://localhost:8000    |
| API Docs | http://localhost:8000/docs |

## Environment Variables

### Backend (`backend/.env`)

| Variable           | Default         | Description                      |
|--------------------|-----------------|----------------------------------|
| `GEMINI_API_KEY`   | —               | Google AI Studio API key (required) |
| `CHROMA_PERSIST_DIR` | `./chroma_data` | ที่เก็บ ChromaDB                |
| `CHUNK_SIZE`       | `500`           | ขนาด chunk (tokens)             |
| `CHUNK_OVERLAP`    | `50`            | overlap ระหว่าง chunk           |
| `TOP_K`            | `5`             | จำนวน chunks ที่ดึงมาตอบ       |

### Frontend (`frontend/.env.local`)

| Variable                | Default                   | Description         |
|-------------------------|---------------------------|---------------------|
| `NEXT_PUBLIC_API_URL`   | `http://localhost:8000`   | URL ของ backend     |

## API

### `GET /health`
```json
{ "status": "ok" }
```

### `POST /upload`
Upload PDF (multipart/form-data, field: `files`) — รองรับหลายไฟล์พร้อมกัน

```json
{
  "status": "success",
  "doc_id": "uuid",
  "filename": "example.pdf",
  "chunks_count": 42
}
```

### `POST /upload/stream`
เหมือน `/upload` แต่ stream SSE progress ระหว่าง embedding

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

## Project Structure

```
rag-search/
├── backend/
│   ├── main.py                  # FastAPI app + CORS
│   ├── routers/
│   │   ├── upload.py            # POST /upload, /upload/stream
│   │   └── search.py            # POST /search
│   ├── services/
│   │   ├── pdf_service.py       # อ่านและ chunk PDF
│   │   ├── embedding_service.py # Gemini Embeddings (batch + retry)
│   │   ├── chroma_service.py    # ChromaDB operations
│   │   └── llm_service.py       # Gemini 2.0 Flash
│   ├── models/
│   │   └── schemas.py           # Pydantic models
│   ├── chroma_data/             # ChromaDB storage (gitignored)
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Search page
│   │   └── upload/page.tsx      # Upload page
│   ├── components/
│   │   ├── SearchBar.tsx
│   │   ├── SearchResults.tsx
│   │   └── UploadZone.tsx       # drag & drop + SSE progress
│   └── lib/
│       └── api.ts               # fetch helpers
│
├── docs/
│   ├── overview.md
│   └── roadmap.md
├── docker-compose.yml
└── README.md
```
