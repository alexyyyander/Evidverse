import pytest
import asyncio
from httpx import AsyncClient
from unittest.mock import MagicMock, patch, AsyncMock

@pytest.mark.asyncio
async def test_generate_clip_api(client: AsyncClient, db_session):
    # Login
    await client.post("/api/v1/auth/register", json={"email": "clip_user@example.com", "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": "clip_user@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Mock Celery task delay
    with patch("app.api.v1.endpoints.generation.generate_clip_workflow.delay") as mock_task:
        mock_task.return_value.id = "workflow_uuid"
        
        response = await client.post(
            "/api/v1/generate/clip",
            json={"topic": "A cat adventure"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "workflow_uuid"
        assert data["status"] == "pending"
        
        args, _ = mock_task.call_args
        assert args[0] == "A cat adventure"

def test_workflow_logic_sync():
    # Test workflow logic (mocking external services)
    from app.workers.workflow_tasks import generate_clip_workflow
    
    # We mock asyncio.set_event_loop to avoid "MagicMock is not EventLoop" error
    # But better, we can avoid mocking new_event_loop entirely if we just mock what it does.
    # The workflow task calls:
    # loop = asyncio.new_event_loop()
    # asyncio.set_event_loop(loop)
    # loop.run_until_complete(...)
    
    # If we don't mock asyncio, it creates a real loop.
    # But since we run this test synchronously (not marked async), it's fine to create a loop.
    # The only issue is `story_service.generate_storyboard` is async.
    # We should mock `story_service.generate_storyboard` to return a Future or Coroutine that resolves to our value.
    
    async def mock_generate_storyboard(topic):
        return [
            {"scene_number": 1, "visual_description": "A cute cat", "narration": "Once upon a time"}
        ]

    with patch("app.workers.workflow_tasks.story_service.generate_storyboard", side_effect=mock_generate_storyboard) as mock_story, \
         patch("app.workers.workflow_tasks.generate_character_image") as mock_img_task, \
         patch("app.workers.workflow_tasks.generate_video_from_image") as mock_vid_task:
        
        # Mock Image Task Result
        mock_img_res = MagicMock()
        mock_img_res.result = {"status": "succeeded", "image_url": "http://img.url"}
        mock_img_task.apply.return_value = mock_img_res

        # Mock Video Task Result
        mock_vid_res = MagicMock()
        mock_vid_res.result = {"status": "succeeded", "video_url": "http://vid.url"}
        mock_vid_task.apply.return_value = mock_vid_res
        
        # Running the workflow
        # Note: generate_clip_workflow will create a new loop. 
        # Since we are not in an async test function, this should be safe.
        
        result = generate_clip_workflow("topic", 1)
        
        assert result["status"] == "succeeded"
        assert len(result["clips"]) == 1
        assert result["clips"][0]["video_url"] == "http://vid.url"
        
        mock_img_task.apply.assert_called()
        mock_vid_task.apply.assert_called()
