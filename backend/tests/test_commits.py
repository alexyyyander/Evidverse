import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_commits(client: AsyncClient, db_session):
    # Login
    await client.post("/api/v1/auth/register", json={"email": "commit_user@example.com", "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": "commit_user@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Project
    proj_res = await client.post("/api/v1/projects/", json={"name": "Commit Project"}, headers=headers)
    project_id = proj_res.json()["id"]

    # 1. First Commit (Initial)
    # branch 'main' should be auto-created if logic works, or we need to ensure project creation makes it.
    # In `CommitService` we added logic to auto-create 'main' branch if missing.
    
    commit1_data = {
        "project_id": project_id,
        "message": "Initial commit",
        "video_assets": {"clips": []},
        "branch_name": "main"
    }
    
    res1 = await client.post("/api/v1/commits/", json=commit1_data, headers=headers)
    assert res1.status_code == 200
    c1 = res1.json()
    assert c1["message"] == "Initial commit"
    assert c1["parent_hash"] is None
    c1_id = c1["id"]

    # 2. Second Commit
    commit2_data = {
        "project_id": project_id,
        "message": "Added clip 1",
        "video_assets": {"clips": [{"id": 1}]},
        "branch_name": "main"
    }
    
    res2 = await client.post("/api/v1/commits/", json=commit2_data, headers=headers)
    assert res2.status_code == 200
    c2 = res2.json()
    assert c2["message"] == "Added clip 1"
    assert c2["parent_hash"] == c1_id # Should point to previous HEAD
    c2_id = c2["id"]
    
    # 3. Verify Branch HEAD
    # We don't have a direct API to get branch HEAD yet, but we can check if next commit picks up c2 as parent
    commit3_data = {
        "project_id": project_id,
        "message": "Added clip 2",
        "video_assets": {"clips": [{"id": 1}, {"id": 2}]},
        "branch_name": "main"
    }
    res3 = await client.post("/api/v1/commits/", json=commit3_data, headers=headers)
    c3 = res3.json()
    assert c3["parent_hash"] == c2_id
