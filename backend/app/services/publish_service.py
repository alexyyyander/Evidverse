import json
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.sql import func
from fastapi import HTTPException

from app.core.crypto import encrypt_text, decrypt_text
from app.models.publish import PublishAccount, PublishJob
from app.models.project import Project
from app.models.branch import Branch
from app.models.commit import Commit


class PublishService:
    @staticmethod
    def validate_credential(platform: str, credential_json: str) -> tuple[bool, str | None]:
        try:
            data = json.loads(credential_json)
        except Exception:
            return False, "Invalid credential_json"

        plat = (platform or "").strip().lower()
        if plat == "bilibili":
            cookies: Any = None
            if isinstance(data, dict):
                cookies = data.get("cookies")
                user = data.get("user")
                if isinstance(user, dict) and isinstance(user.get("cookies"), dict):
                    cookies = user.get("cookies")
                if cookies is None:
                    cookies = data
            if not isinstance(cookies, dict):
                return False, "Invalid bilibili credential format"
            required = ["SESSDATA", "bili_jct", "DedeUserID"]
            missing = [k for k in required if not str(cookies.get(k) or "").strip()]
            if missing:
                return False, f"Missing bilibili cookie fields: {', '.join(missing)}"
            return True, None

        if plat == "douyin":
            return True, None

        return False, f"Unsupported platform: {platform}"

    @staticmethod
    async def create_account(db: AsyncSession, owner_internal_id: int, platform: str, label: str | None, credential_json: str) -> PublishAccount:
        try:
            json.loads(credential_json)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid credential_json")

        acc = PublishAccount(
            owner_internal_id=owner_internal_id,
            platform=platform,
            label=label,
            credential_enc=encrypt_text(credential_json),
        )
        db.add(acc)
        await db.commit()
        await db.refresh(acc)
        return acc

    @staticmethod
    async def list_accounts(db: AsyncSession, owner_internal_id: int) -> list[PublishAccount]:
        result = await db.execute(select(PublishAccount).where(PublishAccount.owner_internal_id == owner_internal_id))
        return list(result.scalars().all())

    @staticmethod
    async def get_account_by_public_id(db: AsyncSession, owner_internal_id: int, account_id: str) -> Optional[PublishAccount]:
        q = select(PublishAccount).where(
            PublishAccount.owner_internal_id == owner_internal_id,
            PublishAccount.public_id == account_id,
        )
        res = await db.execute(q)
        return res.scalar_one_or_none()

    @staticmethod
    async def get_account_by_internal_id(db: AsyncSession, owner_internal_id: int, account_internal_id: int) -> Optional[PublishAccount]:
        q = select(PublishAccount).where(
            PublishAccount.owner_internal_id == owner_internal_id,
            PublishAccount.internal_id == account_internal_id,
        )
        res = await db.execute(q)
        return res.scalar_one_or_none()

    @staticmethod
    async def validate_account(db: AsyncSession, owner_internal_id: int, account: PublishAccount) -> PublishAccount:
        credential_json = PublishService.decrypt_account_credential(account)
        ok, err = PublishService.validate_credential(account.platform, credential_json)
        account.last_checked_at = func.now()
        if ok:
            if account.status != "disabled":
                account.status = "active"
            account.last_error = None
        else:
            if account.status != "disabled":
                account.status = "expired"
            account.last_error = err
        await db.commit()
        await db.refresh(account)
        return account

    @staticmethod
    async def set_account_status(db: AsyncSession, owner_internal_id: int, account: PublishAccount, status: str) -> PublishAccount:
        v = (status or "").strip().lower()
        if v not in {"active", "expired", "disabled"}:
            raise HTTPException(status_code=400, detail="Invalid status")
        account.status = v
        await db.commit()
        await db.refresh(account)
        return account

    @staticmethod
    async def delete_account(db: AsyncSession, owner_internal_id: int, account: PublishAccount) -> None:
        await db.delete(account)
        await db.commit()

    @staticmethod
    async def resolve_project_internal_id(db: AsyncSession, project_public_or_numeric: str) -> Optional[int]:
        text = (project_public_or_numeric or "").strip()
        if not text:
            return None
        if text.isdigit():
            res = await db.execute(select(Project.internal_id).where(Project.internal_id == int(text)))
            row = res.first()
            return int(row[0]) if row else None
        res = await db.execute(select(Project.internal_id).where(Project.public_id == text))
        row = res.first()
        return int(row[0]) if row else None

    @staticmethod
    async def resolve_branch_id(db: AsyncSession, project_internal_id: int, branch_name: str | None) -> Optional[int]:
        if not branch_name:
            return None
        res = await db.execute(select(Branch.internal_id).where(Branch.project_id == project_internal_id, Branch.name == branch_name))
        row = res.first()
        return int(row[0]) if row else None

    @staticmethod
    async def resolve_branch_name(db: AsyncSession, branch_id: int | None) -> Optional[str]:
        if not branch_id:
            return None
        res = await db.execute(select(Branch.name).where(Branch.internal_id == branch_id))
        row = res.first()
        return str(row[0]) if row else None

    @staticmethod
    async def resolve_project_public_id(db: AsyncSession, project_internal_id: int | None) -> Optional[str]:
        if not project_internal_id:
            return None
        res = await db.execute(select(Project.public_id).where(Project.internal_id == project_internal_id))
        row = res.first()
        return str(row[0]) if row else None

    @staticmethod
    def _find_video_url(value: Any) -> Optional[str]:
        if isinstance(value, str):
            s = value.strip()
            if s.startswith("http://") or s.startswith("https://") or s.startswith("file://"):
                if ".mp4" in s.lower() or ".mov" in s.lower() or ".m4v" in s.lower():
                    return s
            return None
        if isinstance(value, dict):
            for k, v in value.items():
                if k in {"video_url", "url", "video"} and isinstance(v, str):
                    hit = PublishService._find_video_url(v)
                    if hit:
                        return hit
                hit = PublishService._find_video_url(v)
                if hit:
                    return hit
        if isinstance(value, list):
            for item in value:
                hit = PublishService._find_video_url(item)
                if hit:
                    return hit
        return None

    @staticmethod
    def collect_video_urls(value: Any) -> list[str]:
        urls: list[str] = []

        def _is_video_url(s: str) -> bool:
            v = s.strip().lower()
            if not (v.startswith("http://") or v.startswith("https://") or v.startswith("file://")):
                return False
            return any(ext in v for ext in [".mp4", ".mov", ".m4v"])

        def _walk(v: Any) -> None:
            if isinstance(v, str):
                if _is_video_url(v):
                    urls.append(v.strip())
                return
            if isinstance(v, dict):
                for vv in v.values():
                    _walk(vv)
                return
            if isinstance(v, list):
                for item in v:
                    _walk(item)
                return

        _walk(value)
        seen: set[str] = set()
        uniq: list[str] = []
        for u in urls:
            if u in seen:
                continue
            seen.add(u)
            uniq.append(u)
        return uniq

    @staticmethod
    async def resolve_publish_video_source(db: AsyncSession, project_internal_id: int, branch_name: str) -> str:
        res = await db.execute(select(Branch).where(Branch.project_id == project_internal_id, Branch.name == branch_name))
        branch = res.scalar_one_or_none()
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        if not branch.head_commit_id:
            raise HTTPException(status_code=400, detail="Branch has no commits to export")
        commit = await db.get(Commit, branch.head_commit_id)
        if not commit:
            raise HTTPException(status_code=404, detail="HEAD commit not found")

        if isinstance(commit.video_url, str) and commit.video_url.strip():
            return commit.video_url.strip()

        urls = PublishService.collect_video_urls(commit.video_assets)
        if len(urls) == 1:
            return urls[0]
        if len(urls) > 1:
            return f"export://{project_internal_id}/{branch.internal_id}"

        raise HTTPException(status_code=400, detail="No exportable video URL found in HEAD commit")

    @staticmethod
    async def resolve_export_video_url(db: AsyncSession, project_internal_id: int, branch_name: str) -> str:
        res = await db.execute(select(Branch).where(Branch.project_id == project_internal_id, Branch.name == branch_name))
        branch = res.scalar_one_or_none()
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        if not branch.head_commit_id:
            raise HTTPException(status_code=400, detail="Branch has no commits to export")
        commit = await db.get(Commit, branch.head_commit_id)
        if not commit:
            raise HTTPException(status_code=404, detail="HEAD commit not found")

        if isinstance(commit.video_url, str) and commit.video_url.strip():
            return commit.video_url.strip()

        hit = PublishService._find_video_url(commit.video_assets)
        if hit:
            return hit

        raise HTTPException(status_code=400, detail="No exportable video URL found in HEAD commit")

    @staticmethod
    async def create_job(
        db: AsyncSession,
        owner_internal_id: int,
        account: PublishAccount,
        project_internal_id: Optional[int],
        branch_id: Optional[int],
        video_url: str,
        title: str | None,
        description: str | None,
        tags: list[str] | None,
        bilibili_tid: int | None = None,
        cover_url: str | None = None,
        scheduled_publish_at: Any | None = None,
        multi_part: bool = False,
    ) -> PublishJob:
        job = PublishJob(
            owner_internal_id=owner_internal_id,
            account_internal_id=account.internal_id,
            project_internal_id=project_internal_id,
            branch_id=branch_id,
            platform=account.platform,
            video_url=video_url,
            title=title,
            description=description,
            tags=tags,
            bilibili_tid=bilibili_tid,
            cover_url=cover_url,
            scheduled_publish_at=scheduled_publish_at,
            multi_part=bool(multi_part),
            status="pending",
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job

    @staticmethod
    async def get_job_by_public_id(db: AsyncSession, owner_internal_id: int, job_id: str) -> Optional[PublishJob]:
        q = select(PublishJob).where(PublishJob.owner_internal_id == owner_internal_id, PublishJob.public_id == job_id)
        res = await db.execute(q)
        return res.scalar_one_or_none()

    @staticmethod
    def decrypt_account_credential(account: PublishAccount) -> str:
        return decrypt_text(account.credential_enc)


publish_service = PublishService()
