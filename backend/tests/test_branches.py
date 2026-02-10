import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_branch_management(client: AsyncClient, db_session):
    # Login
    await client.post("/api/v1/auth/register", json={"email": "branch_user@example.com", "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": "branch_user@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Project
    proj_res = await client.post("/api/v1/projects/", json={"name": "Branch Project"}, headers=headers)
    project_id = proj_res.json()["id"]

    # 1. Create Initial Commit (to have something to branch from)
    commit_data = {
        "project_id": project_id,
        "message": "Initial",
        "video_assets": {"version": 1},
        "branch_name": "main"
    }
    commit_res = await client.post("/api/v1/commits/", json=commit_data, headers=headers)
    assert commit_res.status_code == 200
    commit_id = commit_res.json()["id"]

    # 2. Create new branch 'dev' from 'main' (which points to commit_id)
    # The API expects from_commit_hash. We can pass commit_id.
    branch_data = {
        "project_id": project_id,
        "name": "dev",
        "from_commit_hash": commit_id
    }
    branch_res = await client.post("/api/v1/branches/", json=branch_data, headers=headers)
    assert branch_res.status_code == 200
    branch = branch_res.json()
    assert branch["name"] == "dev"
    assert branch["head_commit_id"] == commit_id

    # 3. Get Project Graph
    graph_res = await client.get(f"/api/v1/projects/{project_id}/graph", headers=headers)
    assert graph_res.status_code == 200
    graph = graph_res.json()
    assert len(graph["branches"]) == 2 # main and dev
    assert len(graph["commits"]) == 1

    # 4. Get Head of 'dev'
    head_res = await client.get(f"/api/v1/projects/{project_id}/head?branch_name=dev", headers=headers)
    assert head_res.status_code == 200
    head = head_res.json()
    assert head["commit_id"] == commit_id
    assert head["video_assets"]["version"] == 1

    # 5. Commit to 'dev'
    # Create a new commit on 'dev' branch
    commit2_data = {
        "project_id": project_id,
        "message": "Dev update",
        "video_assets": {"version": 2},
        "branch_name": "dev"
    }
    commit2_res = await client.post("/api/v1/commits/", json=commit2_data, headers=headers)
    assert commit2_res.status_code == 200
    commit2_id = commit2_res.json()["id"]

    # Verify 'dev' head updated
    head_res_2 = await client.get(f"/api/v1/projects/{project_id}/head?branch_name=dev", headers=headers)
    assert head_res_2.json()["commit_id"] == commit2_id

    # Verify 'main' head still old
    head_res_main = await client.get(f"/api/v1/projects/{project_id}/head?branch_name=main", headers=headers)
    assert head_res_main.json()["commit_id"] == commit_id
