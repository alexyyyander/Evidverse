"""add clip segments table

Revision ID: 5c2d9a7f1b30
Revises: 4a1b6c8d2e10
Create Date: 2026-02-13 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "5c2d9a7f1b30"
down_revision: Union[str, None] = "4a1b6c8d2e10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "clip_segments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(), nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id"), nullable=True),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("input_artifacts", sa.JSON(), nullable=True),
        sa.Column("assets_ref", sa.JSON(), nullable=True),
        sa.Column("celery_task_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_clip_segments_public_id", "clip_segments", ["public_id"], unique=True)
    op.create_index("ix_clip_segments_owner_id", "clip_segments", ["owner_id"], unique=False)
    op.create_index("ix_clip_segments_project_id", "clip_segments", ["project_id"], unique=False)
    op.create_index("ix_clip_segments_branch_id", "clip_segments", ["branch_id"], unique=False)
    op.create_index("ix_clip_segments_celery_task_id", "clip_segments", ["celery_task_id"], unique=False)
    op.create_index("ix_clip_segments_status", "clip_segments", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_clip_segments_status", table_name="clip_segments")
    op.drop_index("ix_clip_segments_celery_task_id", table_name="clip_segments")
    op.drop_index("ix_clip_segments_branch_id", table_name="clip_segments")
    op.drop_index("ix_clip_segments_project_id", table_name="clip_segments")
    op.drop_index("ix_clip_segments_owner_id", table_name="clip_segments")
    op.drop_index("ix_clip_segments_public_id", table_name="clip_segments")
    op.drop_table("clip_segments")
