import pytest
import asyncio
from httpx import AsyncClient
from unittest.mock import MagicMock, patch, AsyncMock

@pytest.mark.asyncio
async def test_generate_character_api(client: AsyncClient, db_session):
    # Login
    await client.post("/api/v1/auth/register", json={"email": "gen_user@example.com", "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": "gen_user@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Mock Celery task delay
    with patch("app.api.v1.endpoints.generation.generate_character_image.delay") as mock_task:
        mock_task.return_value.id = "task_uuid"
        
        response = await client.post(
            "/api/v1/generate/character",
            json={"prompt": "cyberpunk girl"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "task_uuid"
        assert data["status"] == "pending"
        
        # Verify task called with correct args
        args, _ = mock_task.call_args
        assert args[0] == "cyberpunk girl"
        # User ID is 2nd arg, hard to know exact ID, but it's an int
        assert isinstance(args[1], int)

# Don't use @pytest.mark.asyncio for this one to avoid loop conflict
def test_image_task_execution_sync():
    # Test the Celery task logic itself (without Celery worker)
    # We need to mock StableDiffusionClient and storage_service
    
    from app.workers.image_tasks import generate_character_image
    
    with patch("app.workers.image_tasks.StableDiffusionClient") as MockClient, \
         patch("app.workers.image_tasks.storage_service") as mock_storage:
        
        mock_sd_instance = MockClient.return_value
        mock_sd_instance.generate_image = AsyncMock(return_value=b"fake_image_bytes")
        
        mock_storage.upload_file.return_value = True
        
        # Run task directly (it's a celery task wrapper, calling it directly usually runs sync if eager, 
        # but here we defined an async internal function. 
        # Since we use `loop.run_until_complete` inside, we can call it synchronously.)
        
        # However, calling celery task directly returns result ONLY if task_always_eager is True.
        # But we are calling the function decorated with @task.
        # Standard Celery task object is callable.
        
        result = generate_character_image("prompt", 1)
        
        assert result["status"] == "succeeded"
        assert "http://localhost:9000" in result["image_url"]
        
        mock_sd_instance.generate_image.assert_called_once_with(prompt="prompt")
        mock_storage.upload_file.assert_called_once()
