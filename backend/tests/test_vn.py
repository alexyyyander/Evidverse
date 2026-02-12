import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_vn_asset_and_parse_preview(client: AsyncClient):
    email = "vn_user@example.com"
    await client.post("/api/v1/auth/register", json={"email": email, "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": email, "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_project_res = await client.post("/api/v1/projects/", json={"name": "VN Project"}, headers=headers)
    assert create_project_res.status_code == 200
    project_id = create_project_res.json()["id"]

    presigned = await client.post("/api/v1/files/presigned-url", params={"filename": "demo.ks"}, headers=headers)
    assert presigned.status_code == 200
    object_name = presigned.json()["object_name"]

    asset_res = await client.post(
        "/api/v1/vn/assets",
        json={"project_id": project_id, "branch_name": "main", "type": "VN_SCRIPT", "object_name": object_name, "metadata": {"filename": "demo.ks"}},
        headers=headers,
    )
    assert asset_res.status_code == 200
    asset = asset_res.json()
    assert asset["project_id"] == project_id
    assert asset["type"] == "VN_SCRIPT"
    assert isinstance(asset["storage_url"], str) and asset["storage_url"]

    list_res = await client.get("/api/v1/vn/assets", params={"project_id": project_id}, headers=headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert isinstance(items, list) and len(items) >= 1

    renpy = await client.post(
        "/api/v1/vn/parse-preview",
        json={"engine": "RENPY", "script_text": 'label start:\n    e "Hello"\n    "Narration"\n'},
        headers=headers,
    )
    assert renpy.status_code == 200
    data = renpy.json()
    assert data["engine"] == "RENPY"
    assert any(e.get("type") == "SAY" for e in data["events"])

    kirikiri = await client.post(
        "/api/v1/vn/parse-preview",
        json={"engine": "KIRIKIRI", "script_text": "*start\n@say alice Hello\n@jump end\n"},
        headers=headers,
    )
    assert kirikiri.status_code == 200
    data2 = kirikiri.json()
    assert data2["engine"] == "KIRIKIRI"
    assert any(e.get("type") == "LABEL" for e in data2["events"])

    parse_job = await client.post(
        "/api/v1/vn/parse-jobs",
        json={"project_id": project_id, "branch_name": "main", "engine": "RENPY", "script_text": 'label start:\n    e "Hello"\n'},
        headers=headers,
    )
    assert parse_job.status_code == 200
    job = parse_job.json()
    assert isinstance(job["id"], str) and job["id"]
    assert job["status"] in {"pending", "started", "succeeded", "failed"}

    logs = await client.get(f"/api/v1/vn/parse-jobs/{job['id']}/logs", headers=headers)
    assert logs.status_code == 200
    logs_data = logs.json()
    assert isinstance(logs_data.get("items"), list)
