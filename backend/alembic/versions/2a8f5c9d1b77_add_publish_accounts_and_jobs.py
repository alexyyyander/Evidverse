"""add publish accounts and jobs

Revision ID: 2a8f5c9d1b77
Revises: 1f2c3d4e5f60
Create Date: 2026-02-12 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "2a8f5c9d1b77"
down_revision: Union[str, None] = "1f2c3d4e5f60"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "publish_accounts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(), nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("platform", sa.String(), nullable=False),
        sa.Column("label", sa.String(), nullable=True),
        sa.Column("credential_enc", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
    )
    op.create_index("ix_publish_accounts_public_id", "publish_accounts", ["public_id"], unique=True)
    op.create_index("ix_publish_accounts_owner_id", "publish_accounts", ["owner_id"], unique=False)
    op.create_index("ix_publish_accounts_platform", "publish_accounts", ["platform"], unique=False)

    json_type = postgresql.JSONB(astext_type=sa.Text()) if op.get_bind().dialect.name == "postgresql" else sa.JSON()

    op.create_table(
        "publish_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(), nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("publish_accounts.id"), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=True),
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id"), nullable=True),
        sa.Column("platform", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("tags", json_type, nullable=True),
        sa.Column("video_url", sa.Text(), nullable=False),
        sa.Column("celery_task_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("result", json_type, nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_publish_jobs_public_id", "publish_jobs", ["public_id"], unique=True)
    op.create_index("ix_publish_jobs_owner_id", "publish_jobs", ["owner_id"], unique=False)
    op.create_index("ix_publish_jobs_account_id", "publish_jobs", ["account_id"], unique=False)
    op.create_index("ix_publish_jobs_project_id", "publish_jobs", ["project_id"], unique=False)
    op.create_index("ix_publish_jobs_branch_id", "publish_jobs", ["branch_id"], unique=False)
    op.create_index("ix_publish_jobs_platform", "publish_jobs", ["platform"], unique=False)
    op.create_index("ix_publish_jobs_status", "publish_jobs", ["status"], unique=False)
    op.create_index("ix_publish_jobs_celery_task_id", "publish_jobs", ["celery_task_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_publish_jobs_celery_task_id", table_name="publish_jobs")
    op.drop_index("ix_publish_jobs_status", table_name="publish_jobs")
    op.drop_index("ix_publish_jobs_platform", table_name="publish_jobs")
    op.drop_index("ix_publish_jobs_branch_id", table_name="publish_jobs")
    op.drop_index("ix_publish_jobs_project_id", table_name="publish_jobs")
    op.drop_index("ix_publish_jobs_account_id", table_name="publish_jobs")
    op.drop_index("ix_publish_jobs_owner_id", table_name="publish_jobs")
    op.drop_index("ix_publish_jobs_public_id", table_name="publish_jobs")
    op.drop_table("publish_jobs")

    op.drop_index("ix_publish_accounts_platform", table_name="publish_accounts")
    op.drop_index("ix_publish_accounts_owner_id", table_name="publish_accounts")
    op.drop_index("ix_publish_accounts_public_id", table_name="publish_accounts")
    op.drop_table("publish_accounts")

