import os
import shutil
import tempfile
import urllib.request
from datetime import datetime, timezone
from typing import Any

import asyncio
from celery import shared_task
from sqlalchemy import select

from app.core.db import AsyncSessionLocal
from app.models.publish import PublishJob, PublishAccount
from app.services.publish_service import publish_service
from app.services.publish_providers.biliup_provider import upload_with_biliup
from app.services.publish_providers.douyin_provider import upload_to_douyin
from app.services.storage_service import storage_service
from app.models.branch import Branch
from app.models.commit import Commit
from app.core.config import settings


def _download_to_temp(url: str, dir_path: str | None = None) -> tuple[str, bool]:
    parsed = url.lower()
    if parsed.startswith("file://"):
        return url[len("file://") :], False
    if os.path.isabs(url) and os.path.exists(url):
        return url, False

    fd, path = tempfile.mkstemp(prefix="vidgit-upload-", suffix=".mp4", dir=dir_path)
    os.close(fd)
    urllib.request.urlretrieve(url, path)
    return path, True


def _as_unix_ts(dt: datetime) -> int:
    v = dt
    if v.tzinfo is None:
        v = v.replace(tzinfo=timezone.utc)
    return int(v.timestamp())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _append_log(logs: list[dict[str, Any]], level: str, event: str, message: str, data: Any | None = None) -> None:
    entry: dict[str, Any] = {"ts": _now_iso(), "level": level, "event": event, "message": message}
    if data is not None:
        entry["data"] = data
    logs.append(entry)


def _write_concat_list(paths: list[str], list_path: str) -> None:
    def esc(p: str) -> str:
        return p.replace("\\", "\\\\").replace("'", "\\'")

    with open(list_path, "w", encoding="utf-8") as f:
        for p in paths:
            f.write(f"file '{esc(p)}'\n")


def _ffmpeg_concat(input_paths: list[str], output_path: str) -> tuple[bool, str]:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return False, "ffmpeg not installed"

    with tempfile.TemporaryDirectory(prefix="vidgit-concat-") as td:
        list_path = os.path.join(td, "list.txt")
        _write_concat_list(input_paths, list_path)

        cmd_copy = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", list_path, "-c", "copy", output_path]
        proc = subprocess_run(cmd_copy)
        if proc["ok"]:
            return True, ""

        cmd_reencode = [
            ffmpeg,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            list_path,
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-movflags",
            "+faststart",
            output_path,
        ]
        proc2 = subprocess_run(cmd_reencode)
        if proc2["ok"]:
            return True, ""
        return False, (proc2["stderr"] or proc["stderr"] or "ffmpeg concat failed")[-2000:]


def subprocess_run(cmd: list[str]) -> dict[str, Any]:
    import subprocess

    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return {"ok": proc.returncode == 0, "code": proc.returncode, "stdout": proc.stdout, "stderr": proc.stderr}


async def _export_from_head_commit(db, project_internal_id: int, branch_id: int) -> tuple[str, str]:
    branch = (await db.execute(select(Branch).where(Branch.internal_id == branch_id, Branch.project_id == project_internal_id))).scalar_one_or_none()
    if not branch or not branch.head_commit_id:
        raise Exception("Branch not found or has no commits")
    commit = await db.get(Commit, branch.head_commit_id)
    if not commit:
        raise Exception("HEAD commit not found")

    urls = publish_service.collect_video_urls(commit.video_assets)
    if len(urls) == 0:
        raise Exception("No clip video URLs found to export")
    out_fd, out_path = tempfile.mkstemp(prefix="vidgit-export-out-", suffix=".mp4")
    os.close(out_fd)

    with tempfile.TemporaryDirectory(prefix="vidgit-export-") as td:
        if len(urls) == 1:
            src, _ = _download_to_temp(urls[0], td)
            shutil.copyfile(src, out_path)
        else:
            local_parts: list[str] = []
            for u in urls:
                p, _ = _download_to_temp(u, td)
                local_parts.append(p)

            ok, err = _ffmpeg_concat(local_parts, out_path)
            if not ok:
                raise Exception(err)

    object_key = f"exports/{project_internal_id}/{branch.internal_id}/{commit.id[:8]}.mp4"
    ok_upload = storage_service.upload_file_path(out_path, object_key)
    if not ok_upload:
        raise Exception("Failed to upload export to storage")
    base = str(settings.S3_ENDPOINT_URL).rstrip("/")
    export_url = f"{base}/{storage_service.bucket_name}/{object_key}"
    commit.video_url = export_url
    await db.commit()

    return out_path, export_url


async def _export_parts_from_head_commit(db, project_internal_id: int, branch_id: int) -> tuple[list[str], list[str]]:
    branch = (
        await db.execute(
            select(Branch).where(Branch.internal_id == branch_id, Branch.project_id == project_internal_id)
        )
    ).scalar_one_or_none()
    if not branch or not branch.head_commit_id:
        raise Exception("Branch not found or has no commits")
    commit = await db.get(Commit, branch.head_commit_id)
    if not commit:
        raise Exception("HEAD commit not found")

    urls = publish_service.collect_video_urls(commit.video_assets)
    if len(urls) == 0:
        raise Exception("No clip video URLs found to export")

    local_paths: list[str] = []
    export_urls: list[str] = []

    with tempfile.TemporaryDirectory(prefix="vidgit-export-") as td:
        for idx, u in enumerate(urls):
            src, _ = _download_to_temp(u, td)
            out_fd, out_path = tempfile.mkstemp(prefix=f"vidgit-export-p{idx+1:02}-", suffix=".mp4")
            os.close(out_fd)
            shutil.copyfile(src, out_path)
            local_paths.append(out_path)

            object_key = f"exports/{project_internal_id}/{branch.internal_id}/{commit.id[:8]}/p{idx+1:02}.mp4"
            ok_upload = storage_service.upload_file_path(out_path, object_key)
            if not ok_upload:
                raise Exception("Failed to upload export to storage")
            base = str(settings.S3_ENDPOINT_URL).rstrip("/")
            export_urls.append(f"{base}/{storage_service.bucket_name}/{object_key}")

    return local_paths, export_urls


@shared_task(name="app.workers.publish_tasks.publish_job")
def publish_job(job_internal_id: int) -> dict[str, Any]:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def _run() -> dict[str, Any]:
        async with AsyncSessionLocal() as db:
            job = (await db.execute(select(PublishJob).where(PublishJob.internal_id == job_internal_id))).scalar_one_or_none()
            if not job:
                return {"status": "failed", "error": "Job not found"}

            job.attempts = int(job.attempts or 0) + 1
            job.status = "started"
            logs: list[dict[str, Any]] = list(job.logs) if isinstance(job.logs, list) else []
            _append_log(logs, "info", "job_started", "Publish job started", {"attempt": job.attempts})
            job.logs = logs[-200:]
            await db.commit()

            account = (
                await db.execute(select(PublishAccount).where(PublishAccount.internal_id == job.account_internal_id))
            ).scalar_one_or_none()
            if not account:
                logs = list(job.logs) if isinstance(job.logs, list) else []
                _append_log(logs, "error", "account_missing", "Publish account not found")
                job.logs = logs[-200:]
                job.status = "failed"
                job.error = "Account not found"
                await db.commit()
                return {"status": "failed", "error": "Account not found"}

            credential_json = publish_service.decrypt_account_credential(account)
            try:
                local_videos: list[str] = []
                temp_paths: list[str] = []
                export_urls: list[str] = []
                if isinstance(job.video_url, str) and job.video_url.startswith("export://"):
                    logs = list(job.logs) if isinstance(job.logs, list) else []
                    _append_log(logs, "info", "export_start", "Exporting from HEAD commit", {"multi_part": bool(job.multi_part)})
                    job.logs = logs[-200:]
                    await db.commit()
                    _, rest = job.video_url.split("export://", 1)
                    parts = rest.split("/")
                    if len(parts) != 2:
                        raise Exception("Invalid export spec")
                    project_internal_id = int(parts[0])
                    branch_id = int(parts[1])
                    if bool(job.multi_part):
                        local_videos, export_urls = await _export_parts_from_head_commit(db, project_internal_id, branch_id)
                        temp_paths.extend(local_videos)
                        if export_urls:
                            job.input_artifacts = export_urls
                            job.video_url = export_urls[0]
                    else:
                        local_video, export_url = await _export_from_head_commit(db, project_internal_id, branch_id)
                        local_videos = [local_video]
                        temp_paths.append(local_video)
                        export_urls = [export_url]
                        job.input_artifacts = export_urls
                        job.video_url = export_url
                    logs = list(job.logs) if isinstance(job.logs, list) else []
                    _append_log(
                        logs,
                        "info",
                        "export_done",
                        "Export finished",
                        {"parts": len(export_urls) if export_urls else 0},
                    )
                    job.logs = logs[-200:]
                    await db.commit()
                else:
                    if bool(job.multi_part) and isinstance(job.input_artifacts, list) and job.input_artifacts:
                        for u in job.input_artifacts:
                            p, is_tmp = _download_to_temp(str(u))
                            local_videos.append(p)
                            if is_tmp:
                                temp_paths.append(p)
                    else:
                        local_video, is_tmp = _download_to_temp(job.video_url)
                        local_videos = [local_video]
                        if is_tmp:
                            temp_paths.append(local_video)

                meta: dict[str, Any] = {
                    "title": job.title,
                    "description": job.description,
                    "tags": job.tags,
                    "bilibili_tid": job.bilibili_tid,
                    "cover_url": job.cover_url,
                    "scheduled_publish_at": _as_unix_ts(job.scheduled_publish_at) if job.scheduled_publish_at else None,
                    "multi_part": bool(job.multi_part),
                }

                logs = list(job.logs) if isinstance(job.logs, list) else []
                _append_log(logs, "info", "upload_start", "Upload started", {"platform": job.platform, "parts": len(local_videos)})
                job.logs = logs[-200:]
                await db.commit()

                if job.platform == "bilibili":
                    result = upload_with_biliup(local_videos, credential_json, meta)
                elif job.platform == "douyin":
                    if len(local_videos) > 1:
                        result = {"status": "failed", "error": "Douyin provider does not support multi-part upload yet"}
                    else:
                        result = upload_to_douyin(local_videos[0], credential_json, meta)
                else:
                    result = {"status": "failed", "error": f"Unsupported platform: {job.platform}"}
                if export_urls and isinstance(result, dict):
                    result["export_urls"] = export_urls

                logs = list(job.logs) if isinstance(job.logs, list) else []
                _append_log(
                    logs,
                    "info" if result.get("status") == "succeeded" else "error",
                    "upload_done",
                    "Upload finished",
                    {"status": result.get("status"), "exit_code": result.get("exit_code")},
                )
                job.logs = logs[-200:]
            except Exception as e:
                result = {"status": "failed", "error": str(e)}
                logs = list(job.logs) if isinstance(job.logs, list) else []
                _append_log(logs, "error", "exception", "Unhandled exception during publish", {"error": str(e)})
                job.logs = logs[-200:]
            finally:
                try:
                    for p in temp_paths:
                        if p and os.path.exists(p):
                            os.remove(p)
                except Exception:
                    pass

            if result.get("status") == "succeeded":
                job.status = "succeeded"
                job.result = result
                job.error = None
            else:
                job.status = "failed"
                job.result = result
                job.error = str(result.get("error") or "Upload failed")

            if (
                job.status == "failed"
                and bool(settings.PUBLISH_AUTO_RETRY_ENABLED)
                and int(job.attempts or 0) < int(settings.PUBLISH_MAX_ATTEMPTS)
            ):
                countdown = int(settings.PUBLISH_RETRY_BASE_SECONDS) * int(job.attempts or 1)
                countdown = min(countdown, int(settings.PUBLISH_RETRY_MAX_SECONDS))
                next_task = publish_job.apply_async(args=[job.internal_id], countdown=countdown)
                job.celery_task_id = next_task.id
                job.status = "retrying"
                logs = (list(job.logs) if isinstance(job.logs, list) else [])
                _append_log(
                    logs,
                    "info",
                    "auto_retry_scheduled",
                    "Auto retry scheduled",
                    {"countdown_seconds": countdown, "next_task_id": next_task.id},
                )
                job.logs = logs[-200:]

            job.logs = (list(job.logs) if isinstance(job.logs, list) else [])[-200:]
            await db.commit()
            return result

    return loop.run_until_complete(_run())
