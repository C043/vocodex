from typing import TYPE_CHECKING
from sqlalchemy import String, func, ForeignKey, text
from sqlalchemy.orm import declarative_base, mapped_column, relationship
from sqlalchemy.orm.base import Mapped
from sqlalchemy.types import DateTime, Integer, LargeBinary
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
    title: Mapped[str] = mapped_column(String(1200))
    content: Mapped[str] = mapped_column(String(), nullable=False)
    # "text" for pasted text and websites, "pdf" when the entry is a PDF file,
    # "epub" for books, read on upload into JSON blocks of text and pictures
    kind: Mapped[str] = mapped_column(
        String(16), default="text", server_default=text("'text'"), nullable=False
    )
    progress: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0"), nullable=False
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["Users"] = relationship(back_populates="entries", passive_deletes=True)


class EntryFiles(Base):
    """
    The original file of an entry (e.g. the PDF), kept in its own table so
    reading or listing entries never loads the file bytes.
    """

    __tablename__ = "entry_files"

    entry_id: Mapped[int] = mapped_column(
        ForeignKey("entries.id", ondelete="CASCADE"), primary_key=True
    )
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)


class EntryImages(Base):
    """The pictures of a book, referenced by their image_id in its blocks"""

    __tablename__ = "entry_images"

    entry_id: Mapped[int] = mapped_column(
        ForeignKey("entries.id", ondelete="CASCADE"), primary_key=True
    )
    image_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    media_type: Mapped[str] = mapped_column(String(64), nullable=False)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
