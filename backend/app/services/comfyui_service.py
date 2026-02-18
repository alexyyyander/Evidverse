from __future__ import annotations

from typing import Any, Dict, Optional

import httpx

from ai_engine.models.config import settings as ai_settings


class ComfyUIService:
    def __init__(self, host: Optional[str] = None, timeout: int = 30):
        self.host = (host or ai_settings.COMFYUI_HOST).rstrip("/")
        self.timeout = timeout

    def _url(self, path: str) -> str:
        return f"{self.host}/{path.lstrip('/')}"

    async def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.request(method, self._url(path), **kwargs)
                response.raise_for_status()
                content_type = response.headers.get("content-type", "")
                if "application/json" in content_type:
                    return response.json()
                return response.text
        except httpx.HTTPStatusError as e:
            detail = ""
            try:
                detail = e.response.text[:600]
            except Exception:
                detail = str(e)
            raise RuntimeError(f"ComfyUI API {e.response.status_code}: {detail}")
        except httpx.RequestError as e:
            raise RuntimeError(f"ComfyUI request failed: {e}")

    async def health(self) -> Dict[str, Any]:
        reachable = False
        detail: Optional[str] = None
        try:
            await self._request("GET", "/system_stats")
            reachable = True
        except Exception as e:
            detail = str(e)
        return {
            "host": self.host,
            "use_local_models": bool(ai_settings.USE_LOCAL_MODELS),
            "reachable": reachable,
            "detail": detail,
        }

    async def get_object_info(self, node_class: Optional[str] = None) -> Dict[str, Any]:
        if node_class and str(node_class).strip():
            return await self._request("GET", f"/object_info/{node_class.strip()}")
        return await self._request("GET", "/object_info")

    async def get_system_stats(self) -> Dict[str, Any]:
        return await self._request("GET", "/system_stats")

    async def get_queue(self) -> Dict[str, Any]:
        return await self._request("GET", "/queue")

    async def upload_image(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: Optional[str] = None,
        overwrite: bool = False,
        image_type: str = "input",
        subfolder: Optional[str] = None,
    ) -> Dict[str, Any]:
        form_data: Dict[str, Any] = {
            "overwrite": "true" if overwrite else "false",
            "type": image_type,
        }
        if isinstance(subfolder, str) and subfolder.strip():
            form_data["subfolder"] = subfolder.strip()

        files = {
            "image": (
                filename,
                file_bytes,
                content_type or "application/octet-stream",
            )
        }
        return await self._request("POST", "/upload/image", data=form_data, files=files)


comfyui_service = ComfyUIService()

