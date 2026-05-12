import os
import chromadb
from dotenv import load_dotenv

load_dotenv()

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
COLLECTION_NAME = "rag_documents"

# สร้าง client ที่ persist ลงดิสก์
_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)

# ดึง (หรือสร้างใหม่) collection
_collection = _client.get_or_create_collection(
    name=COLLECTION_NAME,
    # บอก ChromaDB ว่าเราจะส่ง embedding เองไม่ใช้ built-in
    metadata={"hnsw:space": "cosine"},
)


def save_chunks(doc_id: str, embedded_chunks: list[dict]) -> None:
    """
    บันทึก embedded chunks ลง ChromaDB
    embedded_chunks: list ของ dict ที่มี keys: text, embedding, metadata
    """
    ids = [f"{doc_id}_{i}" for i in range(len(embedded_chunks))]
    embeddings = [chunk["embedding"] for chunk in embedded_chunks]
    documents = [chunk["text"] for chunk in embedded_chunks]
    metadatas = [chunk["metadata"] for chunk in embedded_chunks]

    _collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )


def query_similar_chunks(query_embedding: list[float], top_k: int = 5) -> list[dict]:
    """
    ค้นหา chunks ที่ใกล้เคียงกับ query vector มากที่สุด
    คืนค่า list ของ dict: {chunk_text, filename, score}
    """
    results = _collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    for doc, meta, dist in zip(documents, metadatas, distances):
        # cosine distance → cosine similarity (ยิ่งใกล้ 1 ยิ่งดี)
        score = round(1 - dist, 4)
        chunks.append({
            "chunk_text": doc,
            "filename": meta.get("filename", "unknown"),
            "page": meta.get("page", 0),
            "score": score,
        })

    return chunks


def get_collection_count() -> int:
    """คืนจำนวน documents ทั้งหมดใน collection"""
    return _collection.count()
