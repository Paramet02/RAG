import os
import time
from google import genai
from google.genai import types
from google.genai.errors import ClientError
from dotenv import load_dotenv

load_dotenv()

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

EMBEDDING_MODEL = "gemini-embedding-001"
BATCH_SIZE = 50  # embed 50 chunks ต่อ 1 API call


def _embed_batch(texts: list[str], task_type: str) -> list[list[float]]:
    """embed หลาย texts ในคำขอเดียว พร้อม retry เมื่อโดน 429"""
    for attempt in range(5):
        try:
            response = _client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=texts,
                config=types.EmbedContentConfig(task_type=task_type),
            )
            return [e.values for e in response.embeddings]
        except ClientError as e:
            if e.code == 429 and attempt < 4 and not _is_daily_quota(str(e)):
                # per-minute rate limit — รอแล้ว retry ได้
                wait = _parse_retry_delay(str(e)) or (2 ** attempt * 10)
                print(f"Rate limit detected. Retrying in {wait}s...")  # log กัน delay
                time.sleep(wait)
            else:
                raise


def _is_daily_quota(message: str) -> bool:
    """เช็คว่า error 429 เป็นแบบโควต้ารายวัน (Daily) หรือไม่"""
    msg = message.lower()
    return "quota" in msg and ("day" in msg or "daily" in msg)


def _parse_retry_delay(message: str) -> float | None:
    """ดึงตัวเลขจาก 'retry in X.XXs' ใน error message"""
    import re
    m = re.search(r"retry[^\d]*(\d+(?:\.\d+)?)\s*s", message, re.IGNORECASE)
    return float(m.group(1)) if m else None


def embed_query(query: str) -> list[float]:
    """แปลง query เป็น embedding vector"""
    return _embed_batch([query], "RETRIEVAL_QUERY")[0]


def embed_chunks(chunks: list[dict]) -> list[dict]:
    """embed ทุก chunk โดย batch — คืน chunks พร้อม field 'embedding'"""
    embedded: list[dict] = []
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        vectors = _embed_batch([c["text"] for c in batch], "RETRIEVAL_DOCUMENT")
        for chunk, vector in zip(batch, vectors):
            embedded.append({**chunk, "embedding": vector})
    return embedded


def embed_chunks_iter(chunks: list[dict]):
    """
    เหมือน embed_chunks แต่ yield (processed_so_far, total, embedded_chunk)
    ทีละ batch เพื่อให้ caller track progress ได้
    """
    total = len(chunks)
    processed = 0
    for i in range(0, total, BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        vectors = _embed_batch([c["text"] for c in batch], "RETRIEVAL_DOCUMENT")
        for chunk, vector in zip(batch, vectors):
            processed += 1
            yield processed, total, {**chunk, "embedding": vector}
