import os
import sys
from pathlib import Path


repo_root = Path(__file__).resolve().parents[1]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))
backend_root = repo_root / "backend"
if backend_root.exists() and str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))


def main() -> None:
    from ai_engine.local.workflow_runner import ComfyUIWorkflowRunner

    workflow_path = Path(__file__).resolve().parents[1] / "models" / "workflows" / "z_image_full_api_prompt.json"
    out_path = Path(os.environ.get("OUT", "/tmp/evidverse_smoke_z_image.png"))
    runner = ComfyUIWorkflowRunner()
    runner.execute_workflow_file(workflow_path, output_path=out_path, max_wait_seconds=7200)
    print(str(out_path))


if __name__ == "__main__":
    main()

