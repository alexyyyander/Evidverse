"""add branch public id and metadata

Revision ID: 6e7a9c2d0f11
Revises: 2a8f5c9d1b77
Create Date: 2026-02-12 00:00:00.000000

"""

from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "6e7a9c2d0f11"
down_revision: Union[str, None] = "2a8f5c9d1b77"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("branches", sa.Column("public_id", sa.String(), nullable=True))
    op.add_column("branches", sa.Column("creator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))
    op.add_column("branches", sa.Column("description", sa.Text(), nullable=True))
    op.add_column(
        "branches",
        sa.Column(
            "tags",
            postgresql.JSONB(astext_type=sa.Text()) if op.get_bind().dialect.name == "postgresql" else sa.JSON(),
            nullable=True,
        ),
    )
    op.add_column("branches", sa.Column("parent_branch_id", sa.Integer(), sa.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True))

    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, project_id FROM branches")).fetchall()
    for (internal_id, project_internal_id) in rows:
        owner_row = bind.execute(sa.text("SELECT owner_id FROM projects WHERE id = :pid"), {"pid": project_internal_id}).fetchone()
        owner_internal_id = int(owner_row[0]) if owner_row else None
        bind.execute(
            sa.text(
                "UPDATE branches SET public_id = :public_id, creator_id = COALESCE(creator_id, :creator_id) WHERE id = :id"
            ),
            {"public_id": str(uuid.uuid4()), "creator_id": owner_internal_id, "id": internal_id},
        )

    op.alter_column("branches", "public_id", nullable=False)
    op.create_index("ix_branches_public_id", "branches", ["public_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_branches_public_id", table_name="branches")
    op.drop_column("branches", "parent_branch_id")
    op.drop_column("branches", "tags")
    op.drop_column("branches", "description")
    op.drop_column("branches", "creator_id")
    op.drop_column("branches", "public_id")

