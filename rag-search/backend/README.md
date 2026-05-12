# RAG Search API 🚀

API สำหรับระบบสืบค้นข้อมูลในรูปแบบ RAG (Retrieval-Augmented Generation) ที่ให้คุณสามารถอัปโหลดไฟล์ PDF และค้นหาคำตอบด้วยภาษาธรรมชาติ (Natural Language) เหมือน Google Search โดยอ้างอิงข้อมูลจากเอกสารที่อัปโหลดไว้

## ✨ Features

- **PDF Processing**: แยกข้อความจาก PDF (ผ่าน `PyPDF2`) และแบ่งส่วนข้อมูล (Chunking) เพื่อเตรียมเข้าระบบเวกเตอร์
- **Smart Embedding**: ใช้โมเดล `gemini-embedding-001` จาก Google ในการแปลงข้อความเป็นเวกเตอร์ พร้อมระบบจัดการ Rate Limit อัตโนมัติ (Exponential Backoff)
- **Vector Search**: ค้นหาข้อมูลที่ใกล้เคียงที่สุดจากฐานข้อมูลเวกเตอร์ (ChromaDB) 
- **Generative Answering**: สรุปและตอบคำถามโดยอ้างอิงจากเอกสารเท่านั้นด้วยโมเดล `gemini-2.0-flash` เพื่อป้องกันการเกิด Hallucination
- **Real-time Progress**: รองรับการสตรีมสถานะการอัปโหลดและ Embedding ผ่าน Server-Sent Events (SSE)

## 🛠️ Technology Stack

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Vector Database**: [ChromaDB](https://www.trychroma.com/) (Persistent Local Storage)
- **LLM & Embedding**: [Google GenAI SDK](https://ai.google.dev/) (Gemini)
- **Text Splitting**: LangChain Text Splitters
- **Package Manager**: [uv](https://github.com/astral-sh/uv) (รองรับ `uv.lock`)

## 📦 Installation & Setup

1. **Clone project และเข้าไปที่โฟลเดอร์ backend**
   ```bash
   cd backend
   ```

2. **ติดตั้ง Dependencies**
   โปรเจกต์นี้จัดการแพ็กเกจด้วย `uv` สามารถติดตั้งได้โดย:
   ```bash
   uv sync
   ```
   หรือถ้าใช้ `pip` ธรรมดา:
   ```bash
   pip install -r requirements.txt
   ```

3. **ตั้งค่า Environment Variables**
   สร้างไฟล์ `.env` หรือคัดลอกไฟล์ `.env.example` เป็น `.env` และกรอก API Key:
   ```bash
   cp .env.example .env
   ```
   ตัวอย่างตัวแปรใน `.env`:
   ```env
   GEMINI_API_KEY="your-google-gemini-api-key"
   CHROMA_PERSIST_DIR="./chroma_data"
   ```

4. **เริ่มรันเซิร์ฟเวอร์**
   ```bash
   fastapi dev main.py
   # หรือ uvicorn main:app --reload
   ```

## 📡 API Endpoints

- **`GET /health`** - ตรวจสอบสถานะ API
- **`POST /upload`** - อัปโหลดไฟล์ PDF หลายไฟล์ (รอประมวลผลจนเสร็จแล้วตอบกลับ)
- **`POST /upload/stream`** - อัปโหลดไฟล์ PDF พร้อมส่งสถานะกลับแบบ Real-time (SSE) มีประโยชน์มากเวลาทำ Loading UI
- **`POST /search`** - ค้นหาคำตอบจากคำถาม (ต้องการ JSON request: `{"query": "คำถาม", "top_k": 5}`)

## 🗂️ Project Structure

```text
backend/
├── main.py                 # FastAPI Application Entrypoint
├── routers/                # จัดการ API Routes
│   ├── search.py           # ควบคุม Endpoint การค้นหา
│   └── upload.py           # ควบคุม Endpoint การอัปโหลด
├── services/               # Core Business Logic 
│   ├── chroma_service.py   # จัดการ VectorDB (ChromaDB)
│   ├── embedding_service.py# จัดการสร้าง Vector Embeddings (Gemini)
│   ├── llm_service.py      # เชื่อมต่อ Gemini 2.0 Flash สำหรับสร้างคำตอบ
│   └── pdf_service.py      # อ่านและ Chunk เอกสาร PDF
├── models/                 # Pydantic Schemas สำหรับรับส่งข้อมูล
├── pyproject.toml          # กำหนด Dependencies ของระบบ (uv)
└── .env                    # เก็บ Secret Keys 
```
