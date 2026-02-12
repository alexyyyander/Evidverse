"""add public uuid ids

Revision ID: 1f2c3d4e5f60
Revises: 9b2b7a1a4c3d
Create Date: 2026-02-12 00:00:00.000000

"""

from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


revision: str = "1f2c3d4e5f60"
down_revision: Union[str, None] = "9b2b7a1a4c3d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("public_id", sa.String(), nullable=True))
    op.add_column("projects", sa.Column("public_id", sa.String(), nullable=True))

    bind = op.get_bind()

    users = bind.execute(sa.text("SELECT id FROM users")).fetchall()
    for (internal_id,) in users:
        bind.execute(
            sa.text("UPDATE users SET public_id = :pid WHERE id = :id"),
            {"pid": str(uuid.uuid4()), "id": internal_id},
        )

    projects = bind.execute(sa.text("SELECT id FROM projects")).fetchall()
    for (internal_id,) in projects:
        bind.execute(
            sa.text("UPDATE projects SET public_id = :pid WHERE id = :id"),
            {"pid": str(uuid.uuid4()), "id": internal_id},
        )

    op.alter_column("users", "public_id", nullable=False)
    op.alter_column("projects", "public_id", nullable=False)

    op.create_index("ix_users_public_id", "users", ["public_id"], unique=True)
    op.create_index("ix_projects_public_id", "projects", ["public_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_projects_public_id", table_name="projects")
    op.drop_index("ix_users_public_id", table_name="users")
    op.drop_column("projects", "public_id")
    op.drop_column("users", "public_id")

