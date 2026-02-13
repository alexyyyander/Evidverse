"""update_commit_model

Revision ID: f0730004746f
Revises: 737c891dc100
Create Date: 2026-02-11 02:13:43.689316

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f0730004746f'
down_revision: Union[str, None] = '737c891dc100'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("commits") as batch_op:
            batch_op.add_column(sa.Column("author_id", sa.Integer(), nullable=False))
            batch_op.add_column(sa.Column("video_assets", sa.JSON(), nullable=True))
            batch_op.create_foreign_key("fk_commits_author_id_users", "users", ["author_id"], ["id"])
        return
    op.add_column("commits", sa.Column("author_id", sa.Integer(), nullable=False))
    op.add_column("commits", sa.Column("video_assets", sa.JSON(), nullable=True))
    op.create_foreign_key("fk_commits_author_id_users", "commits", "users", ["author_id"], ["id"])


def downgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("commits") as batch_op:
            batch_op.drop_constraint("fk_commits_author_id_users", type_="foreignkey")
            batch_op.drop_column("video_assets")
            batch_op.drop_column("author_id")
        return
    op.drop_constraint("fk_commits_author_id_users", "commits", type_="foreignkey")
    op.drop_column("commits", "video_assets")
    op.drop_column("commits", "author_id")
