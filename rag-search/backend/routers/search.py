from fastapi import APIRouter, HTTPException
from models.schemas import SearchRequest, SearchResponse, SourceChunk
from services.embedding_service import embed_query
from services.chroma_service import query_similar_chunks, get_collection_count
from services.llm_service import generate_answer

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    # ตรวจสอบว่ามีเอกสารใน ChromaDB แล้วหรือยัง
    if get_collection_count() == 0:
        raise HTTPException(
            status_code=400,
            detail="ยังไม่มีเอกสารในระบบ กรุณา upload PDF ก่อน",
        )

    # 1. embed query
    query_vector = embed_query(request.query)

    # 2. ค้นหา chunks ที่ใกล้เคียงใน ChromaDB
    similar_chunks = query_similar_chunks(query_vector, top_k=request.top_k)

    if not similar_chunks:
        raise HTTPException(
            status_code=404,
            detail="ไม่พบข้อมูลที่เกี่ยวข้องกับคำถามนี้",
        )

    # 3. สร้างคำตอบจาก LLM
    answer = generate_answer(request.query, similar_chunks)

    # 4. จัดรูปแบบ sources
    sources = [
        SourceChunk(
            filename=chunk["filename"],
            chunk_text=chunk["chunk_text"],
            score=chunk["score"],
        )
        for chunk in similar_chunks
    ]

    return SearchResponse(answer=answer, sources=sources)
