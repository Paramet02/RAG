from pydantic import BaseModel
from typing import List

# Upload
class UploadResponse(BaseModel):
    status: str     # "success" หรือ "error"
    doc_id: str     # uuid ของไฟล์นี้
    filename: str   # "example.pdf"
    chunks_count: int   # ตัดได้ 42 chunks

# Search
class SearchRequest(BaseModel):
    query: str      # "สรุปเนื้อหาเกี่ยวกับ..."
    top_k: int = 5  # อยากได้กี่ผลลัพธ์

class SourceChunk(BaseModel):
      filename: str     # มาจากไฟล์ไหน
      chunk_text: str   # เนื้อหาส่วนนั้น
      score: float      # ใกล้เคียง query แค่ไหน (0-1)

class SearchResponse(BaseModel):
    answer: str         # ตอบคำถามจากข้อมูลที่มี
    sources: List[SourceChunk]  # list ของก้อน source ที่ใช้ตอบ