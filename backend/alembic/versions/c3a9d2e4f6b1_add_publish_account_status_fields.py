"""add publish account status fields

Revision ID: c3a9d2e4f6b1
Revises: 8d4c2a1f0b9e
Create Date: 2026-02-12 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3a9d2e4f6b1"
down_revision: Union[str, None] = "8d4c2a1f0b9e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("publish_accounts", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("publish_accounts", sa.Column("status", sa.String(), nullable=False, server_default="active"))
    op.add_column("publish_accounts", sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("publish_accounts", sa.Column("last_error", sa.Text(), nullable=True))
    op.create_index("ix_publish_accounts_status", "publish_accounts", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_publish_accounts_status", table_name="publish_accounts")
    op.drop_column("publish_accounts", "last_error")
    op.drop_column("publish_accounts", "last_checked_at")
    op.drop_column("publish_accounts", "status")
    op.drop_column("publish_accounts", "updated_at")
