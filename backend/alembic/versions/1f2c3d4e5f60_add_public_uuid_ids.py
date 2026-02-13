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
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("users") as batch_op:
            batch_op.add_column(sa.Column("public_id", sa.String(), nullable=True))
        with op.batch_alter_table("projects") as batch_op:
            batch_op.add_column(sa.Column("public_id", sa.String(), nullable=True))

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

        with op.batch_alter_table("users") as batch_op:
            batch_op.alter_column("public_id", existing_type=sa.String(), nullable=False)
            batch_op.create_index("ix_users_public_id", ["public_id"], unique=True)
        with op.batch_alter_table("projects") as batch_op:
            batch_op.alter_column("public_id", existing_type=sa.String(), nullable=False)
            batch_op.create_index("ix_projects_public_id", ["public_id"], unique=True)
        return

    op.add_column("users", sa.Column("public_id", sa.String(), nullable=True))
    op.add_column("projects", sa.Column("public_id", sa.String(), nullable=True))

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
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("projects") as batch_op:
            batch_op.drop_index("ix_projects_public_id")
            batch_op.drop_column("public_id")
        with op.batch_alter_table("users") as batch_op:
            batch_op.drop_index("ix_users_public_id")
            batch_op.drop_column("public_id")
        return
    op.drop_index("ix_projects_public_id", table_name="projects")
    op.drop_index("ix_users_public_id", table_name="users")
    op.drop_column("projects", "public_id")
    op.drop_column("users", "public_id")
