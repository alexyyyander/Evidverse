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
    # We need to mock generation_service and storage_service
    
    from app.workers.image_tasks import generate_character_image
    
    with patch(
        "app.workers.image_tasks.generation_service.generate_image",
        new=AsyncMock(return_value=b"fake_image_bytes"),
    ) as mock_generate_image, patch("app.workers.image_tasks.storage_service") as mock_storage:
        
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
        
        mock_generate_image.assert_awaited_once_with(prompt="prompt")
        mock_storage.upload_file.assert_called_once()


@pytest.mark.asyncio
async def test_generate_storyboard_accepts_hints_and_returns_meta(client: AsyncClient, db_session):
    await client.post("/api/v1/auth/register", json={"email": "storyboard_user@example.com", "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": "storyboard_user@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "topic": "future detective",
        "stage": "step2_outline",
        "llm_provider": "vllm",
        "story_mode": "edit",
        "story_style": "series",
        "tone": "serious",
        "script_mode": "strict_screenplay",
        "segment_length": "medium",
        "character_seed": [{"name": "A", "identity": "detective"}],
        "existing_outline": {"summary": "old"},
    }

    mocked = {
        "storyboard": [
            {"scene_number": 1, "visual_description": "city at night", "narration": "intro"},
        ],
        "meta": {
            "requested_provider": "vllm",
            "resolved_provider": "cloud",
            "fallback_used": True,
            "warnings": ["provider 'vllm' failed"],
        },
    }

    with patch("app.api.v1.endpoints.generation.story_service.generate_storyboard", new=AsyncMock(return_value=mocked)) as mock_story:
        response = await client.post("/api/v1/generate/storyboard", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["storyboard"], list)
        assert data["meta"]["requested_provider"] == "vllm"
        assert data["meta"]["fallback_used"] is True
        mock_story.assert_awaited_once()


@pytest.mark.asyncio
async def test_generate_storyboard_backward_compatible_list_payload(client: AsyncClient, db_session):
    await client.post("/api/v1/auth/register", json={"email": "storyboard_list_user@example.com", "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": "storyboard_list_user@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    mocked_list = [{"scene_number": 1, "visual_description": "forest", "narration": "n"}]
    with patch("app.api.v1.endpoints.generation.story_service.generate_storyboard", new=AsyncMock(return_value=mocked_list)):
        response = await client.post("/api/v1/generate/storyboard", json={"topic": "legacy"}, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["storyboard"], list)
        assert data["storyboard"][0]["scene_number"] == 1


@pytest.mark.asyncio
async def test_generate_comfyui_rejects_invalid_upload_url(client: AsyncClient, db_session):
    await client.post("/api/v1/auth/register", json={"email": "gen_comfy_invalid@example.com", "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": "gen_comfy_invalid@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "workflow": {"1": {"class_type": "CLIPTextEncode", "inputs": {"text": "hello"}}},
        "uploads": [{"param": "image", "url": "file:///etc/passwd"}],
    }

    with patch("app.api.v1.endpoints.generation.run_comfyui_workflow_asset.delay") as mock_delay:
        response = await client.post("/api/v1/generate/comfyui", json=payload, headers=headers)
        assert response.status_code == 400
        assert "Invalid uploads[0].url" in response.json()["detail"]
        mock_delay.assert_not_called()
