import requests
from typing import Any, Dict, Optional
from vidgit.config import get_token

API_BASE_URL = "http://127.0.0.1:8000/api/v1"

class APIClient:
    def __init__(self):
        self.base_url = API_BASE_URL
        self.token = get_token()

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def login(self, username: str, password: str) -> str:
        url = f"{self.base_url}/auth/login"
        # OAuth2 password flow expects form data
        data = {
            "username": username,
            "password": password
        }
        response = requests.post(url, data=data)
        response.raise_for_status()
        return response.json()["access_token"]

    def get_me(self) -> Dict[str, Any]:
        url = f"{self.base_url}/users/me"
        response = requests.get(url, headers=self._get_headers())
        response.raise_for_status()
        return response.json()

    def create_project(self, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        url = f"{self.base_url}/projects/"
        data = {"name": name, "description": description}
        response = requests.post(url, json=data, headers=self._get_headers())
        response.raise_for_status()
        return response.json()

    def get_projects(self) -> Dict[str, Any]:
        url = f"{self.base_url}/projects/"
        response = requests.get(url, headers=self._get_headers())
        response.raise_for_status()
        return response.json()

    def generate_clip(self, project_id: int, prompt: str) -> str:
        url = f"{self.base_url}/generate/clip"
        data = {"topic": prompt}
        response = requests.post(url, json=data, headers=self._get_headers())
        response.raise_for_status()
        return response.json()["task_id"]

    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        url = f"{self.base_url}/tasks/{task_id}"
        response = requests.get(url, headers=self._get_headers())
        response.raise_for_status()
        return response.json()

    def create_commit(self, project_id: int, message: str, video_assets: Dict[str, Any], branch_name: str, parent_hash: Optional[str] = None) -> Dict[str, Any]:
        url = f"{self.base_url}/commits/"
        data = {
            "project_id": project_id,
            "message": message,
            "video_assets": video_assets,
            "branch_name": branch_name,
            "parent_hash": parent_hash
        }
        response = requests.post(url, json=data, headers=self._get_headers())
        response.raise_for_status()
        return response.json()
    
    def get_head(self, project_id: int, branch_name: str = "main") -> Dict[str, Any]:
        url = f"{self.base_url}/projects/{project_id}/head?branch_name={branch_name}"
        response = requests.get(url, headers=self._get_headers())
        response.raise_for_status()
        return response.json()

    def get_branches(self, project_id: int) -> list:
        url = f"{self.base_url}/projects/{project_id}/branches"
        response = requests.get(url, headers=self._get_headers())
        response.raise_for_status()
        return response.json()
    
    def create_branch(self, project_id: int, name: str, from_commit_hash: str) -> Dict[str, Any]:
        url = f"{self.base_url}/branches/"
        data = {
            "name": name,
            "project_id": project_id,
            "from_commit_hash": from_commit_hash
        }
        response = requests.post(url, json=data, headers=self._get_headers())
        response.raise_for_status()
        return response.json()

api_client = APIClient()
