# Code Tour

อธิบายแต่ละไฟล์ในโปรเจกต์ว่าทำหน้าที่อะไร

---

## Root

| File | หน้าที่ |
|------|---------|
| `docker-compose.yml` | รัน backend + frontend พร้อมกันด้วย Docker |
| `README.md` | วิธี setup และ run โปรเจกต์ |

---

## `backend/`

### Entry Point

| File | หน้าที่ |
|------|---------|
| `main.py` | สร้าง FastAPI app, ตั้ง CORS, register routers, มี `/health` endpoint |
| `.env` | เก็บ API key และ config (ไม่ commit ขึ้น git) |
| `.env.example` | template สำหรับคนที่ clone repo ไปใช้ |
| `requirements.txt` | รายชื่อ Python packages ที่ต้องติดตั้ง |
| `Dockerfile` | build backend เป็น Docker image |

### `routers/`
รับ HTTP request แล้วส่งต่อให้ service — ไม่มี business logic ตรงนี้

| File | หน้าที่ |
|------|---------|
| `upload.py` | `POST /upload` รับ PDF → validate → เรียก pipeline จนเก็บลง ChromaDB, `POST /upload/stream` เหมือนกันแต่ส่ง progress กลับแบบ real-time ผ่าน SSE |
| `search.py` | `POST /search` รับ query → embed → ค้นหา → สร้างคำตอบ → return answer + sources |

### `services/`
Business logic ทั้งหมดอยู่ที่นี่ แต่ละไฟล์ดูแลหน้าที่ของตัวเองอย่างเดียว

---

#### `pdf_service.py`
อ่าน PDF แล้วตัดเป็น chunks พร้อม metadata

| Function | หน้าที่ |
|----------|---------|
| `process_pdf(file_bytes, filename)` | รับ PDF เป็น bytes → อ่านทีละหน้าด้วย PyPDF2 → ตัดแต่ละหน้าเป็น chunks ด้วย `RecursiveCharacterTextSplitter` (500 tokens, overlap 50) → คืน list of `{ text, metadata: { filename, page } }` |

---

#### `embedding_service.py`
แปลง text เป็น vector ด้วย Gemini Embeddings

| Function | หน้าที่ |
|----------|---------|
| `_embed_batch(texts, task_type)` | (private) ส่ง texts หลายตัวไปขอ embedding ในครั้งเดียว — ถ้าโดน rate limit (429) จะรอแล้ว retry อัตโนมัติสูงสุด 5 ครั้ง |
| `_parse_retry_delay(message)` | (private) อ่านตัวเลขจาก error message ของ API เช่น "retry in 12.3s" เพื่อรู้ว่าควรรอนานแค่ไหน |
| `embed_query(query)` | แปลง query string เดียวเป็น vector — ใช้ task_type `RETRIEVAL_QUERY` |
| `embed_chunks(chunks)` | แปลง chunks ทั้งหมดเป็น vector แบบ batch ทีละ 50 — คืน chunks เดิมพร้อมเพิ่ม field `embedding` |
| `embed_chunks_iter(chunks)` | เหมือน `embed_chunks` แต่ yield ผลทีละ chunk เพื่อให้ track progress ได้ — ใช้กับ SSE streaming |

---

#### `chroma_service.py`
จัดการบันทึกและค้นหาข้อมูลใน ChromaDB

| Function | หน้าที่ |
|----------|---------|
| `save_chunks(doc_id, embedded_chunks)` | บันทึก chunks ลง ChromaDB — สร้าง id ในรูป `{doc_id}_{index}` เพื่อป้องกัน conflict ระหว่างไฟล์ |
| `query_similar_chunks(query_embedding, top_k)` | รับ query vector → ค้นหา chunks ที่ใกล้เคียงที่สุด → แปลง cosine distance เป็น similarity score (0–1) → คืน top_k chunks พร้อม filename, page, score |
| `get_collection_count()` | คืนจำนวน chunks ทั้งหมดใน ChromaDB — ใช้ตรวจสอบว่ามีเอกสารในระบบแล้วหรือยังก่อน search |

---

#### `llm_service.py`
สร้างคำตอบจาก context chunks ด้วย Gemini 2.0 Flash

| Function | หน้าที่ |
|----------|---------|
| `generate_answer(query, context_chunks)` | รับ query + chunks จาก ChromaDB → จัดรูป context โดยระบุหมายเลข, ชื่อไฟล์, และหน้า → สร้าง prompt ที่บอก LLM ให้ตอบจาก context เท่านั้น → คืน answer string |

### `models/`

| File | หน้าที่ |
|------|---------|
| `schemas.py` | กำหนด shape ของ request/response ด้วย Pydantic — `UploadResponse`, `SearchRequest`, `SearchResponse`, `SourceChunk` |

---

## `frontend/`

### `app/`
Next.js App Router — แต่ละ folder คือ 1 route

| File | หน้าที่ |
|------|---------|
| `page.tsx` | หน้าหลัก `/` — search bar ตรงกลาง, แสดง answer box + source cards หลัง search |
| `upload/page.tsx` | หน้า `/upload` — layout สำหรับหน้า upload |
| `layout.tsx` | root layout ที่ครอบทุกหน้า — font, metadata, global styles |
| `globals.css` | global CSS + Tailwind base styles |

### `components/`
UI components ที่ reuse ได้

| File | หน้าที่ |
|------|---------|
| `SearchBar.tsx` | input + submit button — กด Enter หรือคลิกปุ่มเพื่อ search, มี clear button และ disabled state ตอน loading |
| `SearchResults.tsx` | แสดงผล search — answer box (LLM answer) ด้านบน, source cards พร้อม relevance score badge และ keyword highlight ด้านล่าง |
| `UploadZone.tsx` | drag & drop zone รับ PDF — เชื่อมกับ SSE endpoint เพื่อแสดง progress แบบ real-time (chunking → embedding → saving) พร้อม progress bar และ list ของไฟล์ที่ upload แล้ว |

### `lib/`

| File | หน้าที่ |
|------|---------|
| `api.ts` | helper functions สำหรับเรียก backend — `searchQuery()` และ `uploadFiles()` พร้อม error handling |

---

## `docs/`

| File | หน้าที่ |
|------|---------|
| `overview.md` | สรุป tech stack และ data flow ของโปรเจกต์ |
| `roadmap.md` | sprint plan และ task checklist |
| `code-tour.md` | ไฟล์นี้ — อธิบายแต่ละไฟล์ในโปรเจกต์ |
