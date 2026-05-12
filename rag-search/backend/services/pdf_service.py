import io
from PyPDF2 import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter


def process_pdf(file_bytes: bytes, filename: str) -> list[dict]:
    reader = PdfReader(io.BytesIO(file_bytes))

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
    )

    chunks = []
    for page_num, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        for chunk in splitter.split_text(text):
            chunks.append({
                "text": chunk,
                "metadata": {
                    "filename": filename,
                    "page": page_num + 1,
                }
            })

    return chunks
