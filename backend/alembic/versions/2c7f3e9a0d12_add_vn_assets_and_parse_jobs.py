"""add vn assets and parse jobs

Revision ID: 2c7f3e9a0d12
Revises: d6f2a1b9c0e3
Create Date: 2026-02-12 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "2c7f3e9a0d12"
down_revision: Union[str, None] = "d6f2a1b9c0e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    json_type = postgresql.JSONB(astext_type=sa.Text()) if op.get_bind().dialect.name == "postgresql" else sa.JSON()

    op.create_table(
        "vn_assets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(), nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id"), nullable=True),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("object_name", sa.String(), nullable=False),
        sa.Column("storage_url", sa.Text(), nullable=False),
        sa.Column("metadata", json_type, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_vn_assets_public_id", "vn_assets", ["public_id"], unique=True)
    op.create_index("ix_vn_assets_owner_id", "vn_assets", ["owner_id"], unique=False)
    op.create_index("ix_vn_assets_project_id", "vn_assets", ["project_id"], unique=False)
    op.create_index("ix_vn_assets_branch_id", "vn_assets", ["branch_id"], unique=False)
    op.create_index("ix_vn_assets_type", "vn_assets", ["type"], unique=False)

    op.create_table(
        "vn_parse_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(), nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id"), nullable=True),
        sa.Column("engine_hint", sa.String(), nullable=True),
        sa.Column("inputs", json_type, nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("result", json_type, nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("logs", json_type, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_vn_parse_jobs_public_id", "vn_parse_jobs", ["public_id"], unique=True)
    op.create_index("ix_vn_parse_jobs_owner_id", "vn_parse_jobs", ["owner_id"], unique=False)
    op.create_index("ix_vn_parse_jobs_project_id", "vn_parse_jobs", ["project_id"], unique=False)
    op.create_index("ix_vn_parse_jobs_branch_id", "vn_parse_jobs", ["branch_id"], unique=False)
    op.create_index("ix_vn_parse_jobs_engine_hint", "vn_parse_jobs", ["engine_hint"], unique=False)
    op.create_index("ix_vn_parse_jobs_status", "vn_parse_jobs", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_vn_parse_jobs_status", table_name="vn_parse_jobs")
    op.drop_index("ix_vn_parse_jobs_engine_hint", table_name="vn_parse_jobs")
    op.drop_index("ix_vn_parse_jobs_branch_id", table_name="vn_parse_jobs")
    op.drop_index("ix_vn_parse_jobs_project_id", table_name="vn_parse_jobs")
    op.drop_index("ix_vn_parse_jobs_owner_id", table_name="vn_parse_jobs")
    op.drop_index("ix_vn_parse_jobs_public_id", table_name="vn_parse_jobs")
    op.drop_table("vn_parse_jobs")

    op.drop_index("ix_vn_assets_type", table_name="vn_assets")
    op.drop_index("ix_vn_assets_branch_id", table_name="vn_assets")
    op.drop_index("ix_vn_assets_project_id", table_name="vn_assets")
    op.drop_index("ix_vn_assets_owner_id", table_name="vn_assets")
    op.drop_index("ix_vn_assets_public_id", table_name="vn_assets")
    op.drop_table("vn_assets")
