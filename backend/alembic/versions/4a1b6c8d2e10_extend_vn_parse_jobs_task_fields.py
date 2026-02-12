"""extend vn parse jobs task fields

Revision ID: 4a1b6c8d2e10
Revises: 2c7f3e9a0d12
Create Date: 2026-02-12 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4a1b6c8d2e10"
down_revision: Union[str, None] = "2c7f3e9a0d12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("vn_parse_jobs", sa.Column("celery_task_id", sa.String(), nullable=True))
    op.add_column("vn_parse_jobs", sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"))
    op.create_index("ix_vn_parse_jobs_celery_task_id", "vn_parse_jobs", ["celery_task_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_vn_parse_jobs_celery_task_id", table_name="vn_parse_jobs")
    op.drop_column("vn_parse_jobs", "attempts")
    op.drop_column("vn_parse_jobs", "celery_task_id")
