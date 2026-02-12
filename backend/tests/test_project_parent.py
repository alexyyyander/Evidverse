import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_fork_sets_parent_project_id(client: AsyncClient, normal_user_token_headers):
    create_res = await client.post(
        "/api/v1/projects/",
        json={"name": "Source", "description": "src"},
        headers=normal_user_token_headers,
    )
    assert create_res.status_code == 200
    source_id = create_res.json()["id"]

    fork_res = await client.post(
        f"/api/v1/projects/{source_id}/fork",
        json={},
        headers=normal_user_token_headers,
    )
    assert fork_res.status_code == 200
    fork_data = fork_res.json()
    assert fork_data["parent_project_id"] == source_id

