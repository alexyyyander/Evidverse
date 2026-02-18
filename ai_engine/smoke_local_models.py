import asyncio
import os
import sys
from pathlib import Path


repo_root = Path(__file__).resolve().parents[1]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))
backend_root = repo_root / "backend"
if backend_root.exists() and str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))


async def _run() -> None:
    from ai_engine.adapters import adapter
    from ai_engine.models.config import LocalModelSettings, settings

    os.environ["USE_LOCAL_MODELS"] = "true"
    os.environ["FALLBACK_TO_CLOUD"] = "true"
    s = LocalModelSettings()
    assert s.USE_LOCAL_MODELS is True
    assert s.FALLBACK_TO_CLOUD is True

    settings.USE_LOCAL_MODELS = True
    settings.FALLBACK_TO_CLOUD = True

    calls = {"local": 0, "cloud": 0}

    async def local_generate_image(*args, **kwargs):
        calls["local"] += 1
        raise RuntimeError("local down")

    async def cloud_generate_image(*args, **kwargs):
        calls["cloud"] += 1
        return b"ok"

    adapter.local.generate_image = local_generate_image
    adapter.cloud.generate_image = cloud_generate_image

    out = await adapter.generate_image(prompt="x")
    assert out == b"ok"
    assert calls["local"] == 1
    assert calls["cloud"] == 1


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
