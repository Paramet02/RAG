# RAG Search — Roadmap & Sprint Plan

## Summary

| Sprint | Focus | Duration | Status |
|---|---|---|---|
| Sprint 1 | Backend Foundation | Week 1 | ✅ Done |
| Sprint 2 | PDF Processing Pipeline | Week 2 | ✅ Done |
| Sprint 3 | Embedding & Vector Store | Week 3 | ✅ Done |
| Sprint 4 | Search & LLM Integration | Week 4 | ✅ Done |
| Sprint 5 | Frontend — Upload Page | Week 5 | ✅ Done |
| Sprint 6 | Frontend — Search Page | Week 6 | ✅ Done |
| Sprint 7 | Integration, Polish & Deploy | Week 7 | ✅ Done |

---

## Sprint 1 — Backend Foundation
**Goal:** FastAPI โครงสร้างทำงานได้ ทดสอบด้วย Swagger UI

### Tasks
- [ ] สร้าง `main.py` — FastAPI app + CORS config
- [ ] สร้าง `models/schemas.py` — Pydantic models (UploadResponse, SearchRequest, SearchResponse)
- [ ] สร้าง router stubs: `routers/upload.py`, `routers/search.py` (return mock data)
- [ ] โหลด env ด้วย `python-dotenv`
- [ ] ทดสอบ `GET /health` → `{ status: "ok" }`
- [ ] ทดสอบ Swagger UI ที่ `http://localhost:8000/docs`

### Done When
- รัน `uv run uvicorn main:app --reload` ได้ ไม่ error
- Swagger UI แสดง endpoints ครบ

---

## Sprint 2 — PDF Processing Pipeline
**Goal:** Upload PDF แล้ว extract + chunk text ได้ถูกต้อง

### Tasks
- [ ] สร้าง `services/pdf_service.py`
  - รับ file bytes → PyPDF2 อ่านทีละ page
  - LangChain `RecursiveCharacterTextSplitter` (chunk_size=500, overlap=50)
  - return `list[{ text, metadata: { filename, page } }]`
- [ ] เชื่อม `POST /upload` → รับ multipart file → เรียก pdf_service
- [ ] Validate: รับเฉพาะ `.pdf`, จำกัดขนาด 20MB
- [ ] ทดสอบด้วย PDF จริงว่า chunk ออกมาถูก

### Done When
- Upload PDF → ได้ list of chunks พร้อม metadata กลับมา (log หรือ response)

---

## Sprint 3 — Embedding & Vector Store
**Goal:** เก็บ chunks ลง ChromaDB ได้ ค้นหา similarity ได้

### Tasks
- [ ] สร้าง `services/embedding_service.py`
  - `embed_texts(texts[])` → เรียก Gemini `text-embedding-004` (batch)
  - `embed_query(query)` → embed ด้วย task_type `retrieval_query`
- [ ] สร้าง `services/chroma_service.py`
  - init ChromaDB client (persist ที่ `./chroma_data`)
  - `add_chunks(chunks, embeddings)` → upsert พร้อม metadata
  - `similarity_search(query_embedding, top_k)` → return top chunks + scores
- [ ] เชื่อม `/upload` pipeline ครบ: PDF → chunks → embed → ChromaDB
- [ ] ทดสอบ: upload PDF แล้ว query ChromaDB ตรงๆ ดูผล

### Done When
- Upload PDF → ChromaDB มี records
- `similarity_search` return chunks ที่เกี่ยวข้องได้

---

## Sprint 4 — Search & LLM Integration
**Goal:** ค้นหาด้วยภาษาธรรมชาติ → ได้คำตอบ + source

### Tasks
- [ ] สร้าง `services/llm_service.py`
  - build prompt: `context (chunks joined) + question`
  - เรียก Gemini 2.0 Flash `generate_content`
  - return answer string
- [ ] เชื่อม `POST /search` pipeline ครบ:
  - embed query → similarity search → build prompt → LLM → response
- [ ] Format response: `{ answer, sources: [{ filename, chunk_text, score }] }`
- [ ] ทดสอบ end-to-end: upload PDF → search → ได้คำตอบถูก

### Done When
- `/search` return คำตอบที่มีความหมาย พร้อม sources

---

## Sprint 5 — Frontend: Upload Page
**Goal:** Drag & drop PDF ได้ แสดงสถานะ indexing และ document list

### Tasks
- [ ] สร้าง `components/UploadZone.tsx` — drag & drop (react-dropzone หรือ native)
- [ ] สร้าง `app/upload/page.tsx`
  - ใช้ UploadZone
  - Progress bar ตอน upload/indexing
  - แสดง list of uploaded documents
- [ ] สร้าง `lib/api.ts` — `uploadPDF(file)` fetch ไปที่ backend
- [ ] Error handling: file ไม่ใช่ PDF, ไฟล์ใหญ่เกิน
- [ ] Styling ด้วย Tailwind

### Done When
- Drag PDF → upload สำเร็จ → แสดงชื่อไฟล์ + chunks count

---

## Sprint 6 — Frontend: Search Page
**Goal:** Search UI คล้าย Google — ค้นหาได้ แสดง answer + source cards

### Tasks
- [ ] สร้าง `components/SearchBar.tsx` — input + submit (Enter หรือ button)
- [ ] สร้าง `components/SearchResults.tsx` — cards แสดง source (filename + snippet + score)
- [ ] อัพเดต `app/page.tsx`
  - Answer box (LLM answer) ด้านบน
  - SearchResults ด้านล่าง
  - Loading state ขณะรอ
- [ ] เพิ่ม `lib/api.ts` — `search(query, top_k)` fetch ไปที่ backend
- [ ] Styling: centered layout คล้าย Google

### Done When
- พิมพ์ query → ได้ answer box + source cards ที่คลิกดู snippet ได้

---

## Sprint 7 — Integration, Polish & Deploy
**Goal:** ระบบทำงานได้ครบ end-to-end พร้อม deploy

### Tasks
- [x] End-to-end test: upload → search → ดู answer จริง
- [x] Error handling ทั้ง frontend และ backend (network error, empty results, etc.)
- [x] Loading skeletons / spinner ที่ UI
- [x] CORS config ตรวจสอบ production URL
- [x] `README.md` — วิธี run, env setup, architecture diagram
- [x] (Optional) Docker Compose: backend + frontend
- [ ] (Optional) Deploy: Vercel (frontend) + Railway (backend)

### Done When
- Demo ได้ครบ: upload PDF → ค้นหา → ได้คำตอบพร้อม source โดยไม่ error

---

## Future / Backlog

- [ ] รองรับหลายไฟล์ใน collection เดียว
- [ ] Delete document + re-index
- [ ] ย้าย ChromaDB → pgvector (Supabase) สำหรับ production
- [ ] Auth (ถ้าจะ deploy จริง)
- [ ] Support ไฟล์ประเภทอื่น (DOCX, TXT)
