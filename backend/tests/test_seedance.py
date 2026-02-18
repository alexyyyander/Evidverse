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
    with patch("app.workers.video_tasks.read_bytes_from_url", return_value=b"fake_image_bytes") as mock_read, patch(
        "app.workers.video_tasks.generation_service.generate_video",
        new=AsyncMock(return_value=b"fake_video_bytes"),
    ) as mock_generate_video, patch("app.workers.video_tasks.storage_service") as mock_storage:
        mock_storage.upload_file.return_value = True

        result = generate_video_from_image("http://img.url", "dance")

        assert result["status"] == "succeeded"
        assert "http://localhost:9000" in result["video_url"]
        assert result["video_url"].endswith(".mp4")

        mock_read.assert_called_once_with("http://img.url")
        mock_generate_video.assert_awaited_once_with(prompt="dance", input_image=b"fake_image_bytes")
        mock_storage.upload_file.assert_called_once()
