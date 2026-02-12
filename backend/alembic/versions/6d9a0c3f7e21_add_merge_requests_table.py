"""add merge requests table

Revision ID: 6d9a0c3f7e21
Revises: 5c2d9a7f1b30
Create Date: 2026-02-13 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6d9a0c3f7e21"
down_revision: Union[str, None] = "5c2d9a7f1b30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "merge_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(), nullable=False),
        sa.Column("creator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("source_branch_id", sa.Integer(), sa.ForeignKey("branches.id"), nullable=False),
        sa.Column("target_branch_id", sa.Integer(), sa.ForeignKey("branches.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("clip_ids", sa.JSON(), nullable=True),
        sa.Column("merged_clip_ids", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="open"),
        sa.Column("merged_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("merged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_merge_requests_public_id", "merge_requests", ["public_id"], unique=True)
    op.create_index("ix_merge_requests_creator_id", "merge_requests", ["creator_id"], unique=False)
    op.create_index("ix_merge_requests_project_id", "merge_requests", ["project_id"], unique=False)
    op.create_index("ix_merge_requests_source_branch_id", "merge_requests", ["source_branch_id"], unique=False)
    op.create_index("ix_merge_requests_target_branch_id", "merge_requests", ["target_branch_id"], unique=False)
    op.create_index("ix_merge_requests_status", "merge_requests", ["status"], unique=False)
    op.create_index("ix_merge_requests_merged_by", "merge_requests", ["merged_by"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_merge_requests_merged_by", table_name="merge_requests")
    op.drop_index("ix_merge_requests_status", table_name="merge_requests")
    op.drop_index("ix_merge_requests_target_branch_id", table_name="merge_requests")
    op.drop_index("ix_merge_requests_source_branch_id", table_name="merge_requests")
    op.drop_index("ix_merge_requests_project_id", table_name="merge_requests")
    op.drop_index("ix_merge_requests_creator_id", table_name="merge_requests")
    op.drop_index("ix_merge_requests_public_id", table_name="merge_requests")
    op.drop_table("merge_requests")
