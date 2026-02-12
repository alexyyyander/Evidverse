import pytest
from httpx import AsyncClient
from app.models.project import Project
from app.models.like import Like
from sqlalchemy import select

@pytest.mark.asyncio
async def test_feed_and_like(client: AsyncClient, normal_user_token_headers, normal_user):
    # 1. Create a public project
    response = await client.post(
        "/api/v1/projects/",
        json={"name": "Public Project", "description": "For feed test", "is_public": True},
        headers=normal_user_token_headers
    )
    assert response.status_code == 200
    project_id = response.json()["id"]

    # 2. Get Feed (should see the project)
    response = await client.get("/api/v1/projects/feed")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    target = next((p for p in data if p["id"] == project_id), None)
    assert target is not None
    assert target["likes_count"] == 0
    assert target["is_liked"] == False

    # 3. Like the project
    response = await client.post(
        f"/api/v1/projects/{project_id}/like",
        headers=normal_user_token_headers
    )
    assert response.status_code == 200
    assert response.json() == True # Liked

    # 4. Check Feed again (should be liked)
    response = await client.get("/api/v1/projects/feed", headers=normal_user_token_headers)
    assert response.status_code == 200
    data = response.json()
    # Find our project
    target = next((p for p in data if p["id"] == project_id), None)
    assert target is not None
    assert target["likes_count"] == 1
    assert target["is_liked"] == True

    # 5. Unlike
    response = await client.post(
        f"/api/v1/projects/{project_id}/like",
        headers=normal_user_token_headers
    )
    assert response.status_code == 200
    assert response.json() == False # Unliked

    # 6. Check Feed again
    response = await client.get("/api/v1/projects/feed", headers=normal_user_token_headers)
    data = response.json()
    target = next((p for p in data if p["id"] == project_id), None)
    assert target["likes_count"] == 0
    assert target["is_liked"] == False
