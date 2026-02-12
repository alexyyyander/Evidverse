import asyncio
import os
import urllib.request
from datetime import datetime, timezone
from typing import Any

from celery import shared_task
from sqlalchemy import select

from app.core.db import AsyncSessionLocal
from app.models.vn import VNParseJob
from app.services.vn_parse_service import vn_parse_service


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _append_log(logs: list[dict[str, Any]], level: str, event: str, message: str, data: Any | None = None) -> None:
    entry: dict[str, Any] = {"ts": _now_iso(), "level": level, "event": event, "message": message}
    if data is not None:
        entry["data"] = data
    logs.append(entry)


def _read_text_from_url(url: str) -> tuple[str, str | None]:
    u = (url or "").strip()
    if not u:
        return "", "storage_url is required"

    try:
        if u.lower().startswith("file://"):
            path = u[len("file://") :]
            with open(path, "rb") as f:
                raw = f.read()
            return raw.decode("utf-8", errors="replace"), None

        if os.path.isabs(u) and os.path.exists(u):
            with open(u, "rb") as f:
                raw = f.read()
            return raw.decode("utf-8", errors="replace"), None

        with urllib.request.urlopen(u, timeout=20) as resp:
            raw = resp.read()
        return raw.decode("utf-8", errors="replace"), None
    except Exception as e:
        return "", str(e)


@shared_task(name="app.workers.vn_tasks.vn_parse_job")
def vn_parse_job(job_internal_id: int) -> dict[str, Any]:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def _run() -> dict[str, Any]:
        async with AsyncSessionLocal() as db:
            job = (await db.execute(select(VNParseJob).where(VNParseJob.internal_id == job_internal_id))).scalar_one_or_none()
            if not job:
                return {"status": "failed", "error": "Job not found"}

            job.attempts = int(job.attempts or 0) + 1
            job.status = "started"
            logs: list[dict[str, Any]] = list(job.logs) if isinstance(job.logs, list) else []
            _append_log(logs, "info", "job_started", "VN parse job started", {"attempt": job.attempts})
            job.logs = logs[-200:]
            await db.commit()

            engine = (job.engine_hint or "").strip()
            inputs = list(job.inputs) if isinstance(job.inputs, list) else []
            if not engine:
                job.status = "failed"
                job.error = "engine_hint is required"
                logs = list(job.logs) if isinstance(job.logs, list) else []
                _append_log(logs, "error", "invalid_engine", "engine_hint is required")
                job.logs = logs[-200:]
                await db.commit()
                return {"status": "failed", "error": "engine_hint is required"}

            all_events: list[dict[str, Any]] = []
            try:
                for idx, item in enumerate(inputs):
                    kind = str(item.get("kind") or "").strip().lower() if isinstance(item, dict) else ""
                    if kind == "text":
                        text = str(item.get("text") or "")
                        events = vn_parse_service.parse(engine, text)
                        all_events.extend(events)
                        logs = list(job.logs) if isinstance(job.logs, list) else []
                        _append_log(logs, "info", "parsed_text", "Parsed text input", {"index": idx, "events": len(events)})
                        job.logs = logs[-200:]
                        await db.commit()
                        continue

                    if kind == "asset":
                        storage_url = str(item.get("storage_url") or "")
                        text, err = _read_text_from_url(storage_url)
                        if err:
                            raise Exception(f"Failed to read asset: {err}")
                        events = vn_parse_service.parse(engine, text)
                        all_events.extend(events)
                        logs = list(job.logs) if isinstance(job.logs, list) else []
                        _append_log(logs, "info", "parsed_asset", "Parsed asset input", {"index": idx, "events": len(events)})
                        job.logs = logs[-200:]
                        await db.commit()
                        continue

                result = {"status": "succeeded", "engine": engine, "events": all_events, "event_count": len(all_events)}
            except Exception as e:
                result = {"status": "failed", "error": str(e)}
                logs = list(job.logs) if isinstance(job.logs, list) else []
                _append_log(logs, "error", "exception", "Parse failed", {"error": str(e)})
                job.logs = logs[-200:]

            if result.get("status") == "succeeded":
                job.status = "succeeded"
                job.result = result
                job.error = None
            else:
                job.status = "failed"
                job.result = result
                job.error = str(result.get("error") or "Parse failed")

            job.logs = (list(job.logs) if isinstance(job.logs, list) else [])[-200:]
            await db.commit()
            return result

    return loop.run_until_complete(_run())
