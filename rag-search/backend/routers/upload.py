import asyncio
import json
import uuid
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from services.pdf_service import process_pdf
from services.embedding_service import embed_chunks, embed_chunks_iter
from services.chroma_service import save_chunks
from models.schemas import UploadResponse

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"application/pdf"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

_SENTINEL = object()


def _validate(file: UploadFile, file_bytes: bytes) -> None:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type — PDF only")
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 50 MB")


@router.post("/upload", response_model=UploadResponse)
async def upload_multiple_files(files: list[UploadFile] = File(...)):
    results = []
    for file in files:
        file_bytes = await file.read()
        _validate(file, file_bytes)

        doc_id = str(uuid.uuid4())
        chunks = process_pdf(file_bytes, file.filename)
        embedded_chunks = await asyncio.to_thread(embed_chunks, chunks)
        save_chunks(doc_id, embedded_chunks)

        results.append(UploadResponse(
            status="success",
            doc_id=doc_id,
            filename=file.filename,
            chunks_count=len(chunks),
        ))

    return results[0] if len(results) == 1 else results


@router.post("/upload/stream")
async def upload_stream(files: list[UploadFile] = File(...)):
    """SSE endpoint — stream progress ระหว่าง embedding"""
    file_data: list[tuple[str, bytes]] = []
    for file in files:
        file_bytes = await file.read()
        try:
            _validate(file, file_bytes)
        except HTTPException as e:
            async def error_stream(msg=e.detail):
                yield _sse({"type": "error", "error": msg})
            return StreamingResponse(error_stream(), media_type="text/event-stream")
        file_data.append((file.filename, file_bytes))

    async def event_stream():
        for filename, file_bytes in file_data:
            doc_id = str(uuid.uuid4())

            # step 1 — chunking (เร็ว ไม่ต้อง thread)
            yield _sse({"type": "chunking", "filename": filename})
            chunks = process_pdf(file_bytes, filename)
            total = len(chunks)
            yield _sse({"type": "chunked", "filename": filename, "total": total})

            # step 2 — embedding ใน thread แยก ส่ง progress ผ่าน queue
            queue: asyncio.Queue = asyncio.Queue()
            loop = asyncio.get_event_loop()

            def put(item):
                loop.call_soon_threadsafe(queue.put_nowait, item)

            def run_embedding():
                embedded_result = []
                try:
                    for current, _, chunk in embed_chunks_iter(chunks):
                        embedded_result.append(chunk)
                        put(("progress", current, total))
                    put(("done", embedded_result))
                except Exception as exc:
                    put(("error", exc))

            thread_task = loop.run_in_executor(None, run_embedding)

            embedded: list[dict] = []
            while True:
                item = await queue.get()
                if item[0] == "progress":
                    _, current, total_ = item
                    yield _sse({
                        "type": "embedding",
                        "filename": filename,
                        "current": current,
                        "total": total_,
                    })
                elif item[0] == "done":
                    embedded = item[1]
                    await thread_task
                    break
                elif item[0] == "error":
                    await thread_task
                    yield _sse({"type": "error", "error": str(item[1])})
                    return

            # step 3 — save to ChromaDB
            yield _sse({"type": "saving", "filename": filename})
            await asyncio.to_thread(save_chunks, doc_id, embedded)

            yield _sse({
                "type": "done",
                "filename": filename,
                "doc_id": doc_id,
                "chunks_count": total,
            })

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
