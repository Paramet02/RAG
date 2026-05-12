import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODEL_NAME = "gemini-2.0-flash"


def generate_answer(query: str, context_chunks: list[dict]) -> str:
    """
    รับ query + context chunks จาก ChromaDB
    สร้าง prompt แล้วให้ Gemini Flash ตอบ
    """
    context_parts = []
    for i, chunk in enumerate(context_chunks, start=1):
        filename = chunk.get("filename", "unknown")
        page = chunk.get("page", "?")
        text = chunk.get("chunk_text", "")
        context_parts.append(f"[{i}] จากไฟล์: {filename} หน้า {page}\n{text}")

    context_text = "\n\n".join(context_parts)

    prompt = f"""คุณเป็น AI Assistant ที่ตอบคำถามจากเอกสารที่ให้มาเท่านั้น
ห้ามตอบจากความรู้ทั่วไปของตัวเอง ถ้าข้อมูลไม่มีใน context ให้บอกว่า "ไม่พบข้อมูลในเอกสาร"

=== Context จากเอกสาร ===
{context_text}

=== คำถาม ===
{query}

=== คำตอบ ===
ตอบเป็นภาษาเดียวกับคำถาม โดยอ้างอิงจาก context ด้านบน:"""

    response = _client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
    )
    return response.text.strip()
