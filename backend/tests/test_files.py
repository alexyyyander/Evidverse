import pytest
from httpx import AsyncClient
from unittest.mock import MagicMock, patch

@pytest.mark.asyncio
async def test_celery_task_trigger(client: AsyncClient, db_session):
    # Login
    await client.post("/api/v1/auth/register", json={"email": "celery_user@example.com", "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": "celery_user@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Trigger Task
    # We mock celery task to avoid actual execution during unit test (optional, but good for speed)
    # But since we have docker, we could also let it run. 
    # Let's mock .delay() to ensure API calls it.
    with patch("app.api.v1.endpoints.files.test_celery.delay") as mock_delay:
        response = await client.post(
            "/api/v1/files/test-celery",
            json={"msg": "hello"},
            headers=headers
        )
        assert response.status_code == 200
        mock_delay.assert_called_once_with("hello")

@pytest.mark.asyncio
async def test_upload_file(client: AsyncClient, db_session):
    # Login
    email = "upload_user@example.com"
    await client.post("/api/v1/auth/register", json={"email": email, "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": email, "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Mock Storage Service to avoid actual S3 dependency in unit tests
    # If we want integration test, we can use real MinIO. 
    # Let's try to mock for unit test stability.
    with patch("app.api.v1.endpoints.files.storage_service.upload_file", return_value=True) as mock_upload:
        files = {"file": ("test.txt", b"test content", "text/plain")}
        response = await client.post(
            "/api/v1/files/upload",
            files=files,
            headers=headers
        )
        assert response.status_code == 200
        assert "File uploaded successfully" in response.json()["msg"]
        mock_upload.assert_called_once()

@pytest.mark.asyncio
async def test_presigned_url(client: AsyncClient, db_session):
    # Login
    email = "url_user@example.com"
    await client.post("/api/v1/auth/register", json={"email": email, "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": email, "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    with patch("app.api.v1.endpoints.files.storage_service.generate_presigned_url", return_value="http://mock-s3/url") as mock_gen:
        response = await client.post(
            "/api/v1/files/presigned-url?filename=video.mp4",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["url"] == "http://mock-s3/url"
        assert "video.mp4" in data["object_name"]
        mock_gen.assert_called_once()
