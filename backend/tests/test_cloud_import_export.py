import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_export_and_import_project(client: AsyncClient, normal_user_token_headers: dict):
    create = await client.post("/api/v1/projects", json={"name": "Cloud Src", "description": "d", "tags": ["动画"]}, headers=normal_user_token_headers)
    assert create.status_code == 200
    src_id = create.json()["id"]

    ws = {"timeline": {"rows": []}, "beats": []}
    put_ws = await client.put(f"/api/v1/projects/{src_id}/workspace", json=ws, headers=normal_user_token_headers)
    assert put_ws.status_code == 200

    exported = await client.get(f"/api/v1/projects/{src_id}/export", headers=normal_user_token_headers)
    assert exported.status_code == 200
    payload = exported.json()
    assert payload["project"]["name"] == "Cloud Src"
    assert payload["branch"]["name"] == "main"
    assert isinstance(payload["branch"]["workspace_data"], dict)

    imported = await client.post("/api/v1/projects/import", json=payload, headers=normal_user_token_headers)
    assert imported.status_code == 200
    new_id = imported.json()["id"]
    assert new_id != src_id

    get_ws = await client.get(f"/api/v1/projects/{new_id}/workspace", headers=normal_user_token_headers)
    assert get_ws.status_code == 200
    assert get_ws.json() == ws

