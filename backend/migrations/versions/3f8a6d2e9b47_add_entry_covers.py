"""add entry covers table for the previews of pdf and epub entries

Revision ID: 3f8a6d2e9b47
Revises: 7d4e2a9c1b38
Create Date: 2026-10-16 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f8a6d2e9b47'
down_revision: Union[str, Sequence[str], None] = '7d4e2a9c1b38'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'entry_covers',
        sa.Column('entry_id', sa.Integer(), nullable=False),
        sa.Column('data', sa.LargeBinary(), nullable=False),
        sa.ForeignKeyConstraint(['entry_id'], ['entries.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('entry_id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('entry_covers')
