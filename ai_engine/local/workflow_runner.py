import json
import os
import random
import time
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin
import urllib.request
import httpx

from ai_engine.models.config import settings


class ComfyUIWorkflowRunner:
    def __init__(self, host: Optional[str] = None, timeout: int = 300):
        self.host = (host or settings.COMFYUI_HOST).rstrip("/")
        self.timeout = timeout

    def load_json(self, workflow_path: str | Path) -> Dict[str, Any]:
        p = Path(workflow_path)
        return json.loads(p.read_text(encoding="utf-8"))

    def load_prompt(self, workflow_path: str | Path) -> Dict[str, Any]:
        data = self.load_json(workflow_path)
        return self._normalize_to_prompt(data)

    def execute_prompt(
        self,
        prompt: Dict[str, Any],
        *,
        force_new: bool = True,
        poll_interval: float = 1.0,
        max_wait_seconds: int = 3600,
    ) -> bytes:
        p = self._make_prompt_unique(prompt) if force_new else prompt
        prompt_id = self._queue_prompt(p)
        result = self._wait_for_result(prompt_id, poll_interval=poll_interval, max_wait_seconds=max_wait_seconds)
        images = self._download_images_from_result(result)
        if not images:
            if self._was_execution_cached(result.get("status", {}).get("messages") or []):
                raise RuntimeError(
                    "No images found in workflow outputs (execution was cached). "
                    "Set force_new=True or change seed/filename_prefix to avoid cache."
                )
            raise RuntimeError("No images found in workflow outputs")
        return images[0][1]

    def execute_prompt_files(
        self,
        prompt: Dict[str, Any],
        *,
        force_new: bool = True,
        poll_interval: float = 1.0,
        max_wait_seconds: int = 3600,
    ) -> List[Tuple[Dict[str, Any], bytes]]:
        p = self._make_prompt_unique(prompt) if force_new else prompt
        prompt_id = self._queue_prompt(p)
        result = self._wait_for_result(prompt_id, poll_interval=poll_interval, max_wait_seconds=max_wait_seconds)
        return self._download_files_from_result(result)

    def execute_workflow_file(
        self,
        workflow_path: str | Path,
        *,
        force_new: bool = True,
        poll_interval: float = 1.0,
        max_wait_seconds: int = 3600,
        output_path: str | Path | None = None,
    ) -> bytes:
        prompt = self.load_prompt(workflow_path)
        image_bytes = self.execute_prompt(
            prompt,
            force_new=force_new,
            poll_interval=poll_interval,
            max_wait_seconds=max_wait_seconds,
        )
        if output_path is not None:
            out = Path(output_path)
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(image_bytes)
        return image_bytes

    def upload_image_bytes(self, image_bytes: bytes, *, filename: str = "input.png") -> str:
        with httpx.Client(timeout=self.timeout) as client:
            files = {"image": (filename, image_bytes, "application/octet-stream")}
            r = client.post(urljoin(self.host + "/", "upload/image"), files=files)
            r.raise_for_status()
            data = r.json()
            name = str(data.get("name") or "").strip()
            subfolder = str(data.get("subfolder") or "").strip()
            if not name:
                raise RuntimeError("Upload failed: missing filename")
            return f"{subfolder}/{name}" if subfolder else name

    def upload_image_from_url(self, url: str, *, filename: str = "input.png") -> str:
        u = (url or "").strip()
        if not u:
            raise RuntimeError("url is required")

        if u.lower().startswith("file://"):
            local_path = u[len("file://") :]
            with open(local_path, "rb") as f:
                return self.upload_image_bytes(f.read(), filename=Path(local_path).name or filename)

        if os.path.isabs(u) and os.path.exists(u):
            with open(u, "rb") as f:
                return self.upload_image_bytes(f.read(), filename=Path(u).name or filename)

        if u.lower().startswith("http://") or u.lower().startswith("https://"):
            with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
                r = client.get(u)
                r.raise_for_status()
                return self.upload_image_bytes(r.content, filename=filename)

        with urllib.request.urlopen(u, timeout=self.timeout) as resp:
            return self.upload_image_bytes(resp.read(), filename=filename)

    def _queue_prompt(self, prompt: Dict[str, Any]) -> str:
        with httpx.Client(timeout=self.timeout) as client:
            r = client.post(urljoin(self.host + "/", "prompt"), json={"prompt": prompt})
            r.raise_for_status()
            data = r.json()
            prompt_id = str(data.get("prompt_id") or "").strip()
            if not prompt_id:
                raise RuntimeError(f"Missing prompt_id in response: {data}")
            return prompt_id

    def _wait_for_result(self, prompt_id: str, *, poll_interval: float, max_wait_seconds: int) -> Dict[str, Any]:
        deadline = time.time() + max_wait_seconds
        with httpx.Client(timeout=self.timeout) as client:
            while True:
                if time.time() > deadline:
                    raise TimeoutError(f"ComfyUI prompt timed out: {prompt_id}")
                time.sleep(poll_interval)
                r = client.get(urljoin(self.host + "/", f"history/{prompt_id}"))
                r.raise_for_status()
                data = r.json()
                if prompt_id not in data:
                    continue
                result = data[prompt_id]
                status = result.get("status") or {}
                if status.get("completed", False):
                    return result
                if status.get("status_str") == "error" or status.get("errored", False):
                    msg = self._extract_execution_error_message(status.get("messages") or [])
                    raise RuntimeError(msg or f"ComfyUI execution failed: {status}")

    def _download_files_from_result(self, result: Dict[str, Any]) -> List[Tuple[Dict[str, Any], bytes]]:
        outputs = result.get("outputs") or {}
        files_info: List[Dict[str, Any]] = []
        for node_out in outputs.values():
            for key in ("images", "videos", "gifs", "audio", "files"):
                items = node_out.get(key) or []
                for item in items:
                    if isinstance(item, dict) and item.get("filename"):
                        entry = dict(item)
                        entry["_bucket"] = key
                        files_info.append(entry)

        dedup: List[Dict[str, Any]] = []
        seen: set[tuple[str, str, str]] = set()
        for info in files_info:
            identity = (
                str(info.get("filename") or ""),
                str(info.get("subfolder") or ""),
                str(info.get("type") or ""),
            )
            if identity in seen:
                continue
            seen.add(identity)
            dedup.append(info)

        out: List[Tuple[Dict[str, Any], bytes]] = []
        if not dedup:
            return out

        with httpx.Client(timeout=self.timeout) as client:
            for info in dedup:
                params = {
                    "filename": info.get("filename"),
                    "subfolder": info.get("subfolder") or "",
                    "type": info.get("type") or "",
                }
                r = client.get(urljoin(self.host + "/", "view"), params=params)
                r.raise_for_status()
                out.append((info, r.content))
        return out

    def _download_images_from_result(self, result: Dict[str, Any]) -> List[Tuple[Dict[str, Any], bytes]]:
        return [x for x in self._download_files_from_result(result) if str(x[0].get("filename") or "").lower().endswith((".png", ".jpg", ".jpeg", ".webp"))]

    def _normalize_to_prompt(self, data: Any) -> Dict[str, Any]:
        if isinstance(data, dict) and isinstance(data.get("prompt"), dict):
            return data["prompt"]

        if isinstance(data, dict) and data and all(
            isinstance(k, str) and isinstance(v, dict) and isinstance(v.get("class_type"), str) for k, v in data.items()
        ):
            return data

        if isinstance(data, dict) and ("nodes" in data or "links" in data):
            raise ValueError(
                "Workflow looks like ComfyUI UI/workflow format (nodes/links). "
                "Please export 'API Format' JSON and pass that file."
            )

        raise ValueError("Unsupported workflow JSON format")

    def _extract_execution_error_message(self, messages: List[Any]) -> str:
        for m in messages:
            if not isinstance(m, list) or len(m) < 2:
                continue
            if m[0] != "execution_error":
                continue
            payload = m[1] if isinstance(m[1], dict) else {}
            msg = payload.get("exception_message")
            if isinstance(msg, str) and msg.strip():
                return msg.strip()
        return ""

    def _was_execution_cached(self, messages: List[Any]) -> bool:
        for m in messages:
            if isinstance(m, list) and m and m[0] == "execution_cached":
                return True
        return False

    def _make_prompt_unique(self, prompt: Dict[str, Any]) -> Dict[str, Any]:
        p = deepcopy(prompt)
        seed_value = random.randint(1, 2**31 - 1)
        suffix = f"run_{seed_value}"
        for node in p.values():
            if not isinstance(node, dict):
                continue
            ct = node.get("class_type")
            inputs = node.get("inputs")
            if not isinstance(inputs, dict):
                continue
            if ct == "KSampler" and "seed" in inputs:
                inputs["seed"] = seed_value
            if ct == "SaveImage" and "filename_prefix" in inputs:
                base = str(inputs.get("filename_prefix") or "comfyui")
                inputs["filename_prefix"] = f"{base}_{suffix}"
        return p
