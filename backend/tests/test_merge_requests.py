import pytest
from httpx import AsyncClient

from app.models.branch import Branch
from app.models.clip_segment import ClipSegment as ClipSegmentModel
from app.models.project import Project
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_merge_request_flow_merges_clips(client: AsyncClient, db_session: AsyncSession):
    await client.post("/api/v1/auth/register", json={"email": "owner_mr@example.com", "password": "password"})
    login_owner = await client.post("/api/v1/auth/login", data={"username": "owner_mr@example.com", "password": "password"})
    owner_headers = {"Authorization": f"Bearer {login_owner.json()['access_token']}"}

    await client.post("/api/v1/auth/register", json={"email": "contrib_mr@example.com", "password": "password"})
    login_contrib = await client.post("/api/v1/auth/login", data={"username": "contrib_mr@example.com", "password": "password"})
    contrib_headers = {"Authorization": f"Bearer {login_contrib.json()['access_token']}"}

    proj = await client.post("/api/v1/projects/", json={"name": "MR Project", "is_public": True}, headers=owner_headers)
    assert proj.status_code == 200
    project_id = proj.json()["id"]

    fork = await client.post(
        f"/api/v1/projects/{project_id}/fork-branch",
        json={"source_branch_name": "main", "name": "fork/contrib_mr"},
        headers=contrib_headers,
    )
    assert fork.status_code == 200
    source_branch_name = fork.json()["name"]

    project = (await db_session.execute(select(Project).where(Project.public_id == project_id))).scalar_one()
    source_branch = (await db_session.execute(select(Branch).where(Branch.project_id == project.internal_id, Branch.name == source_branch_name))).scalar_one()

    clip = ClipSegmentModel(
        owner_internal_id=source_branch.creator_internal_id,
        project_internal_id=source_branch.project_id,
        branch_id=source_branch.internal_id,
        title="c1",
        status="succeeded",
        assets_ref={"video_url": "http://example.com/a.mp4"},
    )
    db_session.add(clip)
    await db_session.commit()
    await db_session.refresh(clip)

    mr_create = await client.post(
        f"/api/v1/projects/{project_id}/merge-requests",
        json={"source_branch_name": source_branch_name, "target_branch_name": "main", "clip_ids": [clip.public_id], "title": "MR1"},
        headers=contrib_headers,
    )
    assert mr_create.status_code == 200
    mr = mr_create.json()
    assert mr["status"] == "open"

    mr_merge = await client.post(f"/api/v1/merge-requests/{mr['id']}/merge", headers=owner_headers)
    assert mr_merge.status_code == 200
    merged = mr_merge.json()
    assert merged["status"] == "merged"
    assert len(merged.get("merged_clip_ids") or []) == 1

    list_main = await client.get("/api/v1/clips/", params={"project_id": project_id, "branch_name": "main"}, headers=owner_headers)
    assert list_main.status_code == 200
    items = list_main.json()
    assert any(i["id"] == merged["merged_clip_ids"][0] for i in items)
