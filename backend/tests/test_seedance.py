import pytest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock
from app.workers.video_tasks import generate_video_from_image

# Mock celery task to not run in async loop context of pytest
# We need to extract the async logic to test it, or mock run_until_complete behavior.
# The issue is: pytest-asyncio starts a loop, and `generate_video_from_image` tries to start another loop.
# We can mock asyncio.new_event_loop or simply test the async function `_process` if we could access it.
# Or we can run this test synchronously (without @pytest.mark.asyncio) since the Celery task itself is synchronous wrapper.

def test_generate_video_task_sync():
    # Mock SeedanceClient
    with patch("app.workers.video_tasks.SeedanceClient") as MockClient:
        mock_instance = MockClient.return_value
        
        # Mock generate_video response
        mock_instance.generate_video = AsyncMock(return_value={"id": "task_123"})
        
        # Mock get_task_status response (success after 1 poll)
        mock_instance.get_task_status = AsyncMock(return_value={
            "status": "succeeded",
            "output": {"url": "http://video.url"}
        })
        
        # Mock asyncio.new_event_loop to return a mock loop that runs our coroutine
        # But `run_until_complete` is hard to mock correctly for complex logic.
        
        # Better approach: 
        # Since we are inside a test environment, let's just patch `asyncio.new_event_loop` 
        # to return the current running loop if any, OR just run the task.
        # But `generate_video_from_image` calls `new_event_loop` and `set_event_loop`.
        
        # Let's try to mock `app.workers.video_tasks.asyncio` to avoid creating new loop
        # and just execute the coroutine directly? No, the code structure is fixed.
        
        # Let's run this test as a standard sync test.
        # When `generate_video_from_image` is called, it will create a loop.
        # This is fine as long as there is no other loop running in THIS thread.
        # pytest-asyncio might have a loop running.
        
        # Solution: Use `pytest-asyncio` but run this specific test in a separate thread or process?
        # Or simpler: Patch `asyncio.get_event_loop` and `new_event_loop`.
        
        result = generate_video_from_image("http://img.url", "dance")
        
        assert result["status"] == "succeeded"
        assert result["video_url"] == "http://video.url"
        
        mock_instance.generate_video.assert_called_once_with(image_url="http://img.url", prompt="dance")
        mock_instance.get_task_status.assert_called()
