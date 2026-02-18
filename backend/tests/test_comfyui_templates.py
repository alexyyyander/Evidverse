import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock


@pytest.mark.asyncio
async def test_comfyui_template_crud(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={"email": "tpl_user@example.com", "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": "tpl_user@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    workflow = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"model_name": "flux2-klein-4b"}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": "hello", "clip": ["1", 0]}},
    }

    res = await client.post(
        "/api/v1/comfyui/templates",
        json={"name": "my-template", "description": "d", "workflow": workflow, "bindings": [{"node_id": "2", "path": "inputs.text", "param": "prompt"}]},
        headers=headers,
    )
    assert res.status_code == 200
    tpl = res.json()
    assert tpl["name"] == "my-template"
    assert tpl["workflow"]["2"]["inputs"]["text"] == "hello"
    tpl_id = tpl["id"]

    res = await client.get("/api/v1/comfyui/templates", headers=headers)
    assert res.status_code == 200
    items = res.json()
    assert any(x["id"] == tpl_id for x in items)

    res = await client.get(f"/api/v1/comfyui/templates/{tpl_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["id"] == tpl_id

    res = await client.delete(f"/api/v1/comfyui/templates/{tpl_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["ok"] is True


@pytest.mark.asyncio
async def test_comfyui_template_render_enqueues_task(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={"email": "tpl_user2@example.com", "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": "tpl_user2@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    workflow = {"1": {"class_type": "CLIPTextEncode", "inputs": {"text": "hello"}}}
    res = await client.post("/api/v1/comfyui/templates", json={"name": "t", "workflow": workflow}, headers=headers)
    tpl_id = res.json()["id"]

    with patch("app.api.v1.endpoints.comfyui_templates.render_comfyui_workflow.delay") as mock_delay:
        mock_delay.return_value.id = "task_uuid"
        res = await client.post(
            f"/api/v1/comfyui/templates/{tpl_id}/render",
            json={"params": {"prompt": "hi"}},
            headers=headers,
        )
        assert res.status_code == 200
        assert res.json()["task_id"] == "task_uuid"


@pytest.mark.asyncio
async def test_comfyui_official_endpoints_and_execute_workflow(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={"email": "tpl_user3@example.com", "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": "tpl_user3@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    with patch("app.api.v1.endpoints.comfyui_templates.comfyui_service.health", new=AsyncMock(return_value={"reachable": True})):
        res = await client.get("/api/v1/comfyui/health", headers=headers)
        assert res.status_code == 200
        assert res.json()["reachable"] is True

    with patch(
        "app.api.v1.endpoints.comfyui_templates.comfyui_service.get_object_info",
        new=AsyncMock(return_value={"CLIPTextEncode": {"input": {"required": {}}}}),
    ):
        res = await client.get("/api/v1/comfyui/object-info", headers=headers)
        assert res.status_code == 200
        assert "CLIPTextEncode" in res.json()

    body = {
        "workflow": {"1": {"class_type": "CLIPTextEncode", "inputs": {"text": "hello"}}},
        "bindings": [{"node_id": "1", "path": "inputs.text", "param": "prompt"}],
        "params": {"prompt": "world"},
    }
    with patch("app.api.v1.endpoints.comfyui_templates.run_comfyui_workflow_asset.delay") as mock_delay:
        mock_delay.return_value.id = "wf_task_uuid"
        res = await client.post("/api/v1/comfyui/workflows/execute", json=body, headers=headers)
        assert res.status_code == 200
        assert res.json()["task_id"] == "wf_task_uuid"


@pytest.mark.asyncio
async def test_execute_workflow_rejects_invalid_upload_url(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={"email": "tpl_user4@example.com", "password": "password"})
    login_res = await client.post("/api/v1/auth/login", data={"username": "tpl_user4@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    body = {
        "workflow": {"1": {"class_type": "CLIPTextEncode", "inputs": {"text": "hello"}}},
        "uploads": [{"param": "image", "url": "file:///etc/passwd"}],
    }
    with patch("app.api.v1.endpoints.comfyui_templates.run_comfyui_workflow_asset.delay") as mock_delay:
        res = await client.post("/api/v1/comfyui/workflows/execute", json=body, headers=headers)
        assert res.status_code == 400
        assert "Invalid uploads[0].url" in res.json()["detail"]
        mock_delay.assert_not_called()


def test_render_comfyui_workflow_task_sync():
    from app.workers.comfyui_tasks import render_comfyui_workflow

    with patch("app.workers.comfyui_tasks.ai_settings") as mock_ai_settings, patch(
        "app.workers.comfyui_tasks.ComfyUIWorkflowRunner.execute_prompt_files",
        return_value=[({"filename": "a.png", "type": "output", "_bucket": "images"}, b"fake_image_bytes")],
    ), patch("app.workers.comfyui_tasks.storage_service") as mock_storage:
        mock_ai_settings.USE_LOCAL_MODELS = True
        mock_storage.upload_file.return_value = True
        result = render_comfyui_workflow({"1": {"class_type": "x", "inputs": {}}}, [{"node_id": "1", "path": "inputs.prompt", "param": "prompt"}], {"prompt": "p"}, 1)
        assert result["status"] == "succeeded"
        assert "image_url" in result
        assert isinstance(result.get("outputs"), list)
