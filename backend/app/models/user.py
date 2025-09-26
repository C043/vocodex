from typing import Optional
from sqlalchemy import String, func
from sqlalchemy.orm import mapped_column, declarative_base
from sqlalchemy.orm.base import Mapped
from sqlalchemy.types import DateTime

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[Optional[str]] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String(60), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
