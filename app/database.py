"""
Database connection setup.

Defaults to a local SQLite file so any teammate can run this instantly with
zero setup. For real deployment, just set the DATABASE_URL environment
variable to a Postgres connection string, e.g.:

    DATABASE_URL=postgresql://user:password@localhost:5432/supportpilot

No code changes needed elsewhere — SQLAlchemy handles both engines.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./supportpilot.db")

# connect_args is only needed for SQLite
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
