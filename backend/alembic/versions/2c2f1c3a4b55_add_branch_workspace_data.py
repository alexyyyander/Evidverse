"""add branch workspace data

Revision ID: 2c2f1c3a4b55
Revises: 6e7a9c2d0f11
Create Date: 2026-02-12 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2c2f1c3a4b55"
down_revision: Union[str, None] = "6e7a9c2d0f11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("branches", sa.Column("workspace_data", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("branches", "workspace_data")

