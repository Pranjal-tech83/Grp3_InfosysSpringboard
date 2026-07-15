from typing import Optional

from fastapi import APIRouter, Depends, Query
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
    q: str, 
    category: Optional[str] = None, 
    ticket_id: Optional[int] = Query(None, description="Milestone 2: Pass ticket_id to filter the search space using AI tags"),
    limit: int = 10, 
    db: Session = Depends(get_db)
):
    """
    Milestone 2 endpoint: If a ticket_id is supplied, it filters the knowledge
    base search space strictly using the ticket's classification category to prevent 
    irrelevant text context from entering the RAG workflow.
    """
    if ticket_id is not None:
        return crud.search_kb_by_ticket_context(db=db, ticket_id=ticket_id, query=q, limit=limit)
        
    return crud.search_kb(db=db, query=q, category=category, limit=limit)