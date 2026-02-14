import os
import json
from pathlib import Path
from typing import Dict, Any, Optional

VIDGIT_DIR = ".evidverse"
CONFIG_FILE = "config.json"
STAGING_FILE = "staging.json"

class Context:
    def __init__(self):
        self.root = self._find_root()
        self.evidverse_path = self.root / VIDGIT_DIR if self.root else None

    def _find_root(self) -> Optional[Path]:
        current = Path.cwd()
        # Look up until root
        for parent in [current] + list(current.parents):
            if (parent / VIDGIT_DIR).exists():
                return parent
        return None

    def is_initialized(self) -> bool:
        return self.evidverse_path is not None

    def init(self, project_id: int, branch: str = "main"):
        path = Path.cwd() / VIDGIT_DIR
        path.mkdir(exist_ok=True)
        config = {"project_id": project_id, "current_branch": branch}
        with open(path / CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=2)
        
        # Init empty staging
        with open(path / STAGING_FILE, "w") as f:
            json.dump({}, f, indent=2)
        
        # Update self after init
        self.root = Path.cwd()
        self.evidverse_path = path

    def get_config(self) -> Dict[str, Any]:
        if not self.evidverse_path:
            raise FileNotFoundError("Not a evidverse repository (or any of the parent directories): .evidverse")
        
        with open(self.evidverse_path / CONFIG_FILE, "r") as f:
            return json.load(f)

    def update_config(self, key: str, value: Any):
         if not self.evidverse_path:
            raise FileNotFoundError("Not a evidverse repository")
         config = self.get_config()
         config[key] = value
         with open(self.evidverse_path / CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=2)

    def get_staging(self) -> Dict[str, Any]:
        if not self.evidverse_path:
             return {}
        if not (self.evidverse_path / STAGING_FILE).exists():
            return {}
        with open(self.evidverse_path / STAGING_FILE, "r") as f:
            return json.load(f)

    def update_staging(self, assets: Dict[str, Any]):
        if not self.evidverse_path:
             raise FileNotFoundError("Not a evidverse repository")
        
        current = self.get_staging()
        current.update(assets)
        
        with open(self.evidverse_path / STAGING_FILE, "w") as f:
            json.dump(current, f, indent=2)
            
    def clear_staging(self):
        if not self.evidverse_path:
             raise FileNotFoundError("Not a evidverse repository")
        with open(self.evidverse_path / STAGING_FILE, "w") as f:
            json.dump({}, f, indent=2)

context = Context()
