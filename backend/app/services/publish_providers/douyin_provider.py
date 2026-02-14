import json
import os
import shlex
import subprocess
import tempfile
from typing import Any


def _sanitize_text(text: str, credential_json: str) -> str:
    if not text:
        return text
    s = text
    try:
        data = json.loads(credential_json)
        secrets: list[str] = []
        if isinstance(data, dict):
            for v in data.values():
                if isinstance(v, str) and len(v) >= 6:
                    secrets.append(v)
        for secret in sorted(set(secrets), key=len, reverse=True):
            s = s.replace(secret, "***")
    except Exception:
        pass
    for key in ["token", "cookie", "SESSDATA", "access_token", "Authorization", "Bearer"]:
        s = s.replace(f"{key}=", f"{key}=***")
    return s


def upload_to_douyin(video_path: str, credential_json: str, meta: dict[str, Any]) -> dict[str, Any]:
    cmd_template = os.environ.get("DOUYIN_UPLOADER_CMD", "").strip()
    if not cmd_template:
        return {
            "status": "failed",
            "error": "Douyin uploader not configured. Set DOUYIN_UPLOADER_CMD to enable.",
        }

    try:
        json.loads(credential_json)
    except Exception:
        return {"status": "failed", "error": "Invalid credential_json"}

    title = (meta.get("title") or "").strip()
    description = (meta.get("description") or "").strip()

    with tempfile.TemporaryDirectory(prefix="evidverse-douyin-") as td:
        cred_path = os.path.join(td, "credential.json")
        with open(cred_path, "w", encoding="utf-8") as f:
            f.write(credential_json)

        replaced = (
            cmd_template.replace("{video_path}", video_path)
            .replace("{credential_path}", cred_path)
            .replace("{title}", title)
            .replace("{description}", description)
        )
        cmd = shlex.split(replaced)

        env = os.environ.copy()
        env["PAGER"] = "cat"
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
        )

        ok = proc.returncode == 0
        return {
            "status": "succeeded" if ok else "failed",
            "exit_code": proc.returncode,
            "stdout": _sanitize_text(proc.stdout[-8000:], credential_json),
            "stderr": _sanitize_text(proc.stderr[-8000:], credential_json),
            "note": "Experimental. Configure DOUYIN_UPLOADER_CMD with {video_path} and {credential_path}.",
        }
