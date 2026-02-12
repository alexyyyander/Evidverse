import pytest
from httpx import AsyncClient
from unittest.mock import patch


@pytest.mark.asyncio
async def test_vn_comic_to_video_creates_clip_and_public_get(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={"email": "clip_user@example.com", "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": "clip_user@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    proj = await client.post("/api/v1/projects/", json={"name": "VN Clips", "is_public": True}, headers=headers)
    assert proj.status_code == 200
    project_id = proj.json()["id"]

    asset = await client.post(
        "/api/v1/vn/assets",
        json={"project_id": project_id, "branch_name": "main", "type": "SCREENSHOT", "object_name": "test.png"},
        headers=headers,
    )
    assert asset.status_code == 200
    asset_id = asset.json()["id"]

    with patch("app.api.v1.endpoints.vn.generate_video_from_image.delay") as mock_task:
        mock_task.return_value.id = "task_uuid"
        create = await client.post(
            "/api/v1/vn/comic-to-video",
            json={"project_id": project_id, "branch_name": "main", "screenshot_asset_ids": [asset_id], "prompt": "p"},
            headers=headers,
        )
        assert create.status_code == 200
        clip = create.json()
        assert clip["project_id"] == project_id
        assert clip["task_id"] == "task_uuid"
        assert clip["status"] == "pending"
        assert clip["assets_ref"]["screenshots"]

    get_public = await client.get(f"/api/v1/clips/{clip['id']}")
    assert get_public.status_code == 200
    got = get_public.json()
    assert got["id"] == clip["id"]
