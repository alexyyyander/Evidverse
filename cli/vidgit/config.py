import os
import json
from pathlib import Path
from typing import Optional

CONFIG_DIR = Path.home() / ".vidgit"
CREDENTIALS_FILE = CONFIG_DIR / "credentials"

def get_config_dir() -> Path:
    if not CONFIG_DIR.exists():
        CONFIG_DIR.mkdir(parents=True)
    return CONFIG_DIR

def save_token(token: str):
    config_dir = get_config_dir()
    data = {"token": token}
    with open(CREDENTIALS_FILE, "w") as f:
        json.dump(data, f)

def get_token() -> Optional[str]:
    if not CREDENTIALS_FILE.exists():
        return None
    try:
        with open(CREDENTIALS_FILE, "r") as f:
            data = json.load(f)
            return data.get("token")
    except json.JSONDecodeError:
        return None

def clear_token():
    if CREDENTIALS_FILE.exists():
        os.remove(CREDENTIALS_FILE)
