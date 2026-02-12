"""add parent_project_id to projects

Revision ID: 7c6c37de0c19
Revises: 49f94a6a93a0
Create Date: 2026-02-12 01:02:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7c6c37de0c19"
down_revision: Union[str, None] = "49f94a6a93a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("parent_project_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_projects_parent_project_id",
        "projects",
        "projects",
        ["parent_project_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(op.f("ix_projects_parent_project_id"), "projects", ["parent_project_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_projects_parent_project_id"), table_name="projects")
    op.drop_constraint("fk_projects_parent_project_id", "projects", type_="foreignkey")
    op.drop_column("projects", "parent_project_id")

