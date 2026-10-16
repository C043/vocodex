"""add entry images table for the pictures of epub entries

Revision ID: 7d4e2a9c1b38
Revises: 5e0b1f3a7c21
Create Date: 2026-10-16 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7d4e2a9c1b38'
down_revision: Union[str, Sequence[str], None] = '5e0b1f3a7c21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'entry_images',
        sa.Column('entry_id', sa.Integer(), nullable=False),
        sa.Column('image_id', sa.Integer(), nullable=False),
        sa.Column('media_type', sa.String(length=64), nullable=False),
        sa.Column('data', sa.LargeBinary(), nullable=False),
        sa.ForeignKeyConstraint(['entry_id'], ['entries.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('entry_id', 'image_id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('entry_images')
