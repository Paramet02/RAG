from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import upload, search

# load environment variables from .env file
load_dotenv()

# setup FastAPI app
app = FastAPI(
    title="RAG Search API",
    description="Google-like search powered by RAG — upload PDF แล้วค้นหาด้วยภาษาธรรมชาติ",
    version="1.0.0",
)

# allow url origins for ui
origins = [
    "http://localhost",
    "http://localhost:3000",
]

# setup cors middleware to allow requests from ui
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "RAG Search API is running 🚀"}


@app.get("/health")
async def health():
    return {"status": "ok"}


# include routers
app.include_router(upload.router)
app.include_router(search.router)

