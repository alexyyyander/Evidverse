"""add project tags and user full_name

Revision ID: 9b2b7a1a4c3d
Revises: 7c6c37de0c19
Create Date: 2026-02-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "9b2b7a1a4c3d"
down_revision: Union[str, None] = "7c6c37de0c19"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("full_name", sa.String(), nullable=True))
    op.add_column("projects", sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.create_index("ix_projects_tags_gin", "projects", ["tags"], unique=False, postgresql_using="gin")


def downgrade() -> None:
    op.drop_index("ix_projects_tags_gin", table_name="projects")
    op.drop_column("projects", "tags")
    op.drop_column("users", "full_name")

