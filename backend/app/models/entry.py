from typing import TYPE_CHECKING
from sqlalchemy import String, func, ForeignKey
from sqlalchemy.orm import declarative_base, mapped_column, relationship
from sqlalchemy.orm.base import Mapped
from sqlalchemy.types import DateTime
from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import Users


class Entries(Base):
    __tablename__ = "entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(120))
    content: Mapped[str] = mapped_column(String(1000), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["Users"] = relationship(back_populates="entries", passive_deletes=True)
