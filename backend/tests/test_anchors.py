import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_anchor(client: AsyncClient, db_session):
    # Login
    await client.post("/api/v1/auth/register", json={"email": "anchor_user@example.com", "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": "anchor_user@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Project
    proj_res = await client.post("/api/v1/projects/", json={"name": "Anchor Project"}, headers=headers)
    project_id = proj_res.json()["id"]

    # Create Anchor
    response = await client.post(
        "/api/v1/anchors/",
        json={
            "name": "Main Character",
            "project_id": project_id,
            "reference_image_url": "http://s3/ref.png"
        },
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Main Character"
    assert data["project_id"] == project_id

@pytest.mark.asyncio
async def test_get_project_anchors(client: AsyncClient, db_session):
    # Login (using same user for simplicity, but in real test suite should be isolated)
    email = "anchor_list_user@example.com"
    await client.post("/api/v1/auth/register", json={"email": email, "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": email, "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    proj_res = await client.post("/api/v1/projects/", json={"name": "Anchor List Project"}, headers=headers)
    project_id = proj_res.json()["id"]

    # Create 2 Anchors
    await client.post("/api/v1/anchors/", json={"name": "A1", "project_id": project_id, "reference_image_url": "u1"}, headers=headers)
    await client.post("/api/v1/anchors/", json={"name": "A2", "project_id": project_id, "reference_image_url": "u2"}, headers=headers)

    # Get List
    response = await client.get(f"/api/v1/anchors/project/{project_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "A1"
