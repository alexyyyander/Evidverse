import json
import os
import subprocess
import tempfile
import urllib.request
from typing import Any


def _resolve_biliup_bin() -> str:
    return os.environ.get("BILIUP_BIN", "biliup")


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
    for key in ["SESSDATA", "bili_jct", "DedeUserID", "DedeUserID__ckMd5", "access_token", "token", "cookie"]:
        s = s.replace(f"{key}=", f"{key}=***")
    return s


def _download_cover(cover_url: str, dir_path: str) -> tuple[str, bool]:
    v = (cover_url or "").strip()
    if not v:
        return "", False
    if v.startswith("file://"):
        return v[len("file://") :], False
    if os.path.isabs(v) and os.path.exists(v):
        return v, False
    suffix = ".jpg"
    lowered = v.lower()
    for ext in [".jpg", ".jpeg", ".png", ".webp"]:
        if lowered.endswith(ext):
            suffix = ext
            break
    fd, path = tempfile.mkstemp(prefix="evidverse-cover-", suffix=suffix, dir=dir_path)
    os.close(fd)
    urllib.request.urlretrieve(v, path)
    return path, True


def upload_with_biliup(video_paths: str | list[str], credential_json: str, meta: dict[str, Any]) -> dict[str, Any]:
    try:
        json.loads(credential_json)
    except Exception:
        return {"status": "failed", "error": "Invalid credential_json"}

    title = (meta.get("title") or "").strip()
    if not title:
        if isinstance(video_paths, list) and video_paths:
            title = os.path.basename(video_paths[0])
        elif isinstance(video_paths, str):
            title = os.path.basename(video_paths)
        else:
            title = "upload"

    with tempfile.TemporaryDirectory(prefix="evidverse-biliup-") as td:
        cookie_path = os.path.join(td, "cookies.json")
        with open(cookie_path, "w", encoding="utf-8") as f:
            f.write(credential_json)

        paths: list[str] = video_paths if isinstance(video_paths, list) else [video_paths]
        paths = [p for p in paths if isinstance(p, str) and p.strip()]
        if not paths:
            return {"status": "failed", "error": "No video paths provided"}

        cmd: list[str] = [_resolve_biliup_bin(), "-u", cookie_path, "upload", *paths]
        if title:
            cmd.extend(["--title", title])
        desc = (meta.get("description") or "").strip()
        if desc:
            cmd.extend(["--desc", desc])
        tags = meta.get("tags")
        if isinstance(tags, list) and tags:
            cmd.extend(["--tag", ",".join([str(t).strip() for t in tags if str(t).strip()])])
        tid = meta.get("bilibili_tid")
        if isinstance(tid, int):
            cmd.extend(["--tid", str(tid)])
        dtime = meta.get("scheduled_publish_at")
        if isinstance(dtime, int) and dtime > 0:
            cmd.extend(["--dtime", str(dtime)])
        cover_url = (meta.get("cover_url") or "").strip()
        cover_path = ""
        cover_is_tmp = False
        if cover_url:
            cover_path, cover_is_tmp = _download_cover(cover_url, td)
            if cover_path:
                cmd.extend(["--cover", cover_path])

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
            "title": title,
            "note": "This uses biliup CLI; options depend on your biliup version/config.",
        }
