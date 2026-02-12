"""extend publish jobs metadata and retry

Revision ID: 8d4c2a1f0b9e
Revises: 2c2f1c3a4b55
Create Date: 2026-02-12 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "8d4c2a1f0b9e"
down_revision: Union[str, None] = "2c2f1c3a4b55"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    json_type = postgresql.JSONB(astext_type=sa.Text()) if op.get_bind().dialect.name == "postgresql" else sa.JSON()

    op.add_column("publish_jobs", sa.Column("bilibili_tid", sa.Integer(), nullable=True))
    op.add_column("publish_jobs", sa.Column("cover_url", sa.Text(), nullable=True))
    op.add_column("publish_jobs", sa.Column("scheduled_publish_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("publish_jobs", sa.Column("multi_part", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("publish_jobs", sa.Column("input_artifacts", json_type, nullable=True))
    op.add_column("publish_jobs", sa.Column("attempts", sa.Integer(), nullable=False, server_default=sa.text("0")))


def downgrade() -> None:
    op.drop_column("publish_jobs", "attempts")
    op.drop_column("publish_jobs", "input_artifacts")
    op.drop_column("publish_jobs", "multi_part")
    op.drop_column("publish_jobs", "scheduled_publish_at")
    op.drop_column("publish_jobs", "cover_url")
    op.drop_column("publish_jobs", "bilibili_tid")
