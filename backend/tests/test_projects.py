import pytest
from httpx import AsyncClient


def _workspace_with_boundary(boundary: int, locked_summary: str = "locked"):
    return {
        "editorData": {"rows": []},
        "effects": {},
        "editorState": {
            "beats": {"beat_locked": {"id": "beat_locked", "narration": "locked"}},
            "storyWorkflow": {
                "branchPolicy": {
                    "branchName": "main",
                    "lockBoundaryOrder": boundary,
                    "boundaryConfigured": True,
                },
                "nodes": [
                    {
                        "id": "node_locked",
                        "order": 0,
                        "locked": True,
                        "beatIds": ["beat_locked"],
                        "step2": {"summary": locked_summary},
                        "step3": {"status": "done"},
                        "step4": {"status": "done", "confirmed": True},
                    }
                ],
            },
        },
        "editorUi": {"layout": {}, "selection": {}},
    }


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient, db_session):
    # 1. Register & Login
    await client.post("/api/v1/auth/register", json={"email": "proj_user@example.com", "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": "proj_user@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Project
    response = await client.post(
        "/api/v1/projects/",
        json={"name": "My AI Video", "description": "Awesome project"},
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "My AI Video"
    assert "id" in data
    project_id = data["id"]

    # 3. Verify 'main' branch created
    response = await client.get(f"/api/v1/projects/{project_id}/branches", headers=headers)
    assert response.status_code == 200
    branches = response.json()
    assert len(branches) == 1
    assert branches[0]["name"] == "main"
    assert branches[0]["project_id"] == project_id

@pytest.mark.asyncio
async def test_get_projects(client: AsyncClient, db_session):
    # Login (Assuming user created in previous test, but we should be isolated if possible. 
    # Since we use same DB session in tests often, let's create new user to be safe or reuse if fixtures allow.
    # For simplicity, register new user)
    email = "list_user@example.com"
    await client.post("/api/v1/auth/register", json={"email": email, "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": email, "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create 2 projects
    await client.post("/api/v1/projects/", json={"name": "P1"}, headers=headers)
    await client.post("/api/v1/projects/", json={"name": "P2"}, headers=headers)

    # Get List
    response = await client.get("/api/v1/projects/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "P1"
    assert data[1]["name"] == "P2"

@pytest.mark.asyncio
async def test_update_delete_project(client: AsyncClient, db_session):
    email = "crud_user@example.com"
    await client.post("/api/v1/auth/register", json={"email": email, "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": email, "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create
    create_res = await client.post("/api/v1/projects/", json={"name": "Original"}, headers=headers)
    project_id = create_res.json()["id"]

    # Update
    update_res = await client.put(
        f"/api/v1/projects/{project_id}",
        json={"name": "Updated", "description": "New Desc"},
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Updated"

    # Get to verify
    get_res = await client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert get_res.json()["name"] == "Updated"

    # Delete
    del_res = await client.post(
        f"/api/v1/projects/{project_id}/delete",
        json={"confirm_project_id": project_id, "confirm_nickname": "crud_user"},
        headers=headers,
    )
    assert del_res.status_code == 200

    # Get should fail
    get_res = await client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_workspace_boundary_lock_rejects_backward_and_locked_rewrite(client: AsyncClient, db_session):
    email = "workspace_lock_user@example.com"
    await client.post("/api/v1/auth/register", json={"email": email, "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": email, "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_res = await client.post("/api/v1/projects/", json={"name": "Workspace Lock"}, headers=headers)
    project_id = create_res.json()["id"]

    initial = _workspace_with_boundary(boundary=1, locked_summary="locked")
    put_initial = await client.put(f"/api/v1/projects/{project_id}/workspace", json=initial, headers=headers)
    assert put_initial.status_code == 200

    backward = _workspace_with_boundary(boundary=0, locked_summary="locked")
    put_backward = await client.put(f"/api/v1/projects/{project_id}/workspace", json=backward, headers=headers)
    assert put_backward.status_code == 400
    assert "cannot move backward" in put_backward.json()["detail"]

    rewrite_locked = _workspace_with_boundary(boundary=1, locked_summary="rewritten")
    put_rewrite = await client.put(f"/api/v1/projects/{project_id}/workspace", json=rewrite_locked, headers=headers)
    assert put_rewrite.status_code == 400
    assert "immutable" in put_rewrite.json()["detail"]

    # Ensure failed validations do not poison subsequent writes.
    put_retry = await client.put(f"/api/v1/projects/{project_id}/workspace", json=initial, headers=headers)
    assert put_retry.status_code == 200
