import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_fork_branch_and_branch_workspace_permissions(client: AsyncClient):
    owner_email = "owner_branch_ws@example.com"
    await client.post("/api/v1/auth/register", json={"email": owner_email, "password": "password"})
    owner_login = await client.post("/api/v1/auth/login", data={"username": owner_email, "password": "password"})
    owner_token = owner_login.json()["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    other_email = "other_branch_ws@example.com"
    await client.post("/api/v1/auth/register", json={"email": other_email, "password": "password"})
    other_login = await client.post("/api/v1/auth/login", data={"username": other_email, "password": "password"})
    other_token = other_login.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    proj_res = await client.post("/api/v1/projects/", json={"name": "Root", "is_public": True}, headers=owner_headers)
    assert proj_res.status_code == 200
    project_id = proj_res.json()["id"]

    commit_res = await client.post(
        "/api/v1/commits/",
        json={"project_id": project_id, "message": "init", "video_assets": {"version": 1}, "branch_name": "main"},
        headers=owner_headers,
    )
    assert commit_res.status_code == 200

    fork_branch_res = await client.post(f"/api/v1/projects/{project_id}/fork-branch", json={}, headers=other_headers)
    assert fork_branch_res.status_code == 200
    fork_branch = fork_branch_res.json()
    assert isinstance(fork_branch["id"], str) and len(fork_branch["id"]) > 0
    assert isinstance(fork_branch["name"], str) and len(fork_branch["name"]) > 0
    assert fork_branch["project_id"] == project_id

    payload = {"editorData": {"rows": []}, "effects": {}, "editorState": {"scenes": {}}, "editorUi": {"layout": {}, "selection": {}}}
    put_ws = await client.put(
        f"/api/v1/projects/{project_id}/workspace",
        params={"branch_name": fork_branch["name"]},
        json=payload,
        headers=other_headers,
    )
    assert put_ws.status_code == 200

    get_ws = await client.get(
        f"/api/v1/projects/{project_id}/workspace",
        params={"branch_name": fork_branch["name"]},
        headers=other_headers,
    )
    assert get_ws.status_code == 200
    assert get_ws.json() == payload

    deny_main = await client.put(
        f"/api/v1/projects/{project_id}/workspace",
        params={"branch_name": "main"},
        json=payload,
        headers=other_headers,
    )
    assert deny_main.status_code == 403

