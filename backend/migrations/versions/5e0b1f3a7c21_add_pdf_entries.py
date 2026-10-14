"""add entry kind and entry files table for pdf entries

Revision ID: 5e0b1f3a7c21
Revises: b99739494e20
Create Date: 2026-10-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5e0b1f3a7c21'
down_revision: Union[str, Sequence[str], None] = 'b99739494e20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('entries', sa.Column('kind', sa.String(length=16), server_default=sa.text("'text'"), nullable=False))
    op.create_table(
        'entry_files',
        sa.Column('entry_id', sa.Integer(), nullable=False),
        sa.Column('data', sa.LargeBinary(), nullable=False),
        sa.ForeignKeyConstraint(['entry_id'], ['entries.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('entry_id'),
    )
    # Uncompressed, so reading a slice of a file does not load all of it
    op.execute("ALTER TABLE entry_files ALTER COLUMN data SET STORAGE EXTERNAL")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('entry_files')
    op.drop_column('entries', 'kind')
