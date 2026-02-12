"""add publish job logs

Revision ID: d6f2a1b9c0e3
Revises: c3a9d2e4f6b1
Create Date: 2026-02-12 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "d6f2a1b9c0e3"
down_revision: Union[str, None] = "c3a9d2e4f6b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    json_type = postgresql.JSONB(astext_type=sa.Text()) if op.get_bind().dialect.name == "postgresql" else sa.JSON()
    op.add_column("publish_jobs", sa.Column("logs", json_type, nullable=True))


def downgrade() -> None:
    op.drop_column("publish_jobs", "logs")
