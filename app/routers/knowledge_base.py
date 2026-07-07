from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/knowledge-base", tags=["Knowledge Base"])


@router.post("", response_model=schemas.KnowledgeBaseOut, status_code=201)
def create_article(article: schemas.KnowledgeBaseCreate, db: Session = Depends(get_db)):
    return crud.create_kb_article(db, article)


@router.get("", response_model=list[schemas.KnowledgeBaseOut])
def list_articles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.list_kb_articles(db, skip, limit)


@router.get("/search", response_model=list[schemas.KnowledgeBaseOut])
def search_articles(
    q: str, category: Optional[str] = None, limit: int = 10, db: Session = Depends(get_db)
):
    """
    Milestone 2 endpoint: keyword search today, ready to be swapped for the
    Knowledge Retrieval Agent's vector/semantic search (FAISS/Chroma) — see
    crud.search_kb for the single function that needs upgrading.
    """
    return crud.search_kb(db, q, category, limit)
