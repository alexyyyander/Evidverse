import pytest
from httpx import AsyncClient
from unittest.mock import patch


@pytest.mark.asyncio
async def test_publish_account_and_job_flow(client: AsyncClient):
    email = "publish_user@example.com"
    await client.post("/api/v1/auth/register", json={"email": email, "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": email, "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    acc_res = await client.post(
        "/api/v1/publish/accounts",
        json={"platform": "bilibili", "label": "main", "credential_json": "{}"},
        headers=headers,
    )
    assert acc_res.status_code == 200
    acc = acc_res.json()
    assert isinstance(acc["id"], str) and len(acc["id"]) > 0
    assert acc["platform"] == "bilibili"

    validate_res = await client.post(f"/api/v1/publish/accounts/{acc['id']}/validate", headers=headers)
    assert validate_res.status_code == 200
    validated = validate_res.json()
    assert validated["status"] in {"active", "expired", "disabled"}

    disable_res = await client.post(f"/api/v1/publish/accounts/{acc['id']}/disable", headers=headers)
    assert disable_res.status_code == 200
    disabled = disable_res.json()
    assert disabled["status"] == "disabled"

    acc2_res = await client.post(
        "/api/v1/publish/accounts",
        json={"platform": "douyin", "label": "tmp", "credential_json": "{}"},
        headers=headers,
    )
    assert acc2_res.status_code == 200
    acc2 = acc2_res.json()
    del_res = await client.delete(f"/api/v1/publish/accounts/{acc2['id']}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json().get("ok") is True

    create_project_res = await client.post("/api/v1/projects/", json={"name": "P"}, headers=headers)
    assert create_project_res.status_code == 200
    project_id = create_project_res.json()["id"]

    create_commit_res = await client.post(
        "/api/v1/commits/",
        json={
            "project_id": project_id,
            "message": "m",
            "video_assets": {"clips": [{"video_url": "http://example.com/a.mp4"}]},
            "branch_name": "main",
        },
        headers=headers,
    )
    assert create_commit_res.status_code == 200

    with patch("app.api.v1.endpoints.publish.publish_job_task.delay") as mock_delay:
        mock_delay.return_value.id = "task123"
        job_res = await client.post(
            "/api/v1/publish/jobs",
            json={
                "account_id": acc["id"],
                "project_id": project_id,
                "branch_name": "main",
                "title": "Demo",
                "description": "desc",
                "tags": ["a", "b"],
                "bilibili_tid": 171,
                "multi_part": True,
            },
            headers=headers,
        )
        assert job_res.status_code == 200
        job = job_res.json()
        assert isinstance(job["id"], str) and len(job["id"]) > 0
        assert job["platform"] == "bilibili"
        assert job["task_id"] == "task123"
        assert job["status"] == "pending"
        assert job["video_url"] == "http://example.com/a.mp4"
        assert job["bilibili_tid"] == 171
        assert job["multi_part"] is True
        assert job["attempts"] in {0, None}

    with patch("app.api.v1.endpoints.publish.AsyncResult") as MockAR:
        MockAR.return_value.status = "PENDING"
        get_res = await client.get(f"/api/v1/publish/jobs/{job['id']}", headers=headers)
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["id"] == job["id"]
        assert data["status"] in {"pending", "started", "succeeded", "failed"}

    with patch("app.api.v1.endpoints.publish.AsyncResult") as MockAR:
        MockAR.return_value.status = "FAILURE"
        MockAR.return_value.result = "boom"
        get_res = await client.get(f"/api/v1/publish/jobs/{job['id']}", headers=headers)
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["status"] == "failed"

    with patch("app.api.v1.endpoints.publish.publish_job_task.delay") as mock_delay:
        mock_delay.return_value.id = "task456"
        retry_res = await client.post(f"/api/v1/publish/jobs/{job['id']}/retry", headers=headers)
        assert retry_res.status_code == 200
        retried = retry_res.json()
        assert retried["status"] == "pending"
        assert retried["task_id"] == "task456"
