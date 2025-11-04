from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import String, func
from sqlalchemy.orm import mapped_column, declarative_base, relationship
from sqlalchemy.orm.base import Mapped
from sqlalchemy.types import JSON, DateTime
from app.models.base import Base

if TYPE_CHECKING:
    from app.models.entry import Entries


class Users(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[Optional[str]] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String(60), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # One to many entries
    entries: Mapped[List["Entries"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
