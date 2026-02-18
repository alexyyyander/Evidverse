import pytest
from httpx import AsyncClient


async def _register_and_login(client: AsyncClient, email: str, password: str = "password"):
    await client.post("/api/v1/auth/register", json={"email": email, "password": password})
    login_res = await client.post("/api/v1/auth/login", data={"username": email, "password": password})
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_fork_requires_owner_approval_and_request_flow(client: AsyncClient):
    owner_headers = await _register_and_login(client, "fork_owner@example.com")
    user_headers = await _register_and_login(client, "fork_user@example.com")

    create_res = await client.post(
        "/api/v1/projects/",
        json={"name": "Fork Source", "description": "src", "is_public": True},
        headers=owner_headers,
    )
    assert create_res.status_code == 200
    source_id = create_res.json()["id"]

    # Non-owner cannot fork directly.
    direct_fork = await client.post(f"/api/v1/projects/{source_id}/fork", json={}, headers=user_headers)
    assert direct_fork.status_code == 403
    assert "owner approval" in direct_fork.json()["detail"]

    # Create branch on public repo (branch collaboration).
    fork_branch = await client.post(
        f"/api/v1/projects/{source_id}/fork-branch",
        json={"name": "fork/contrib"},
        headers=user_headers,
    )
    assert fork_branch.status_code == 200

    participated = await client.get("/api/v1/projects/branch-participations", headers=user_headers)
    assert participated.status_code == 200
    assert any(item["id"] == source_id for item in participated.json())

    owned_only = await client.get("/api/v1/projects/", headers=user_headers)
    assert owned_only.status_code == 200
    assert all(item["id"] != source_id for item in owned_only.json())

    # Request fork.
    req_res = await client.post(
        f"/api/v1/projects/{source_id}/fork-requests",
        json={"commit_hash": None},
        headers=user_headers,
    )
    assert req_res.status_code == 200
    req = req_res.json()
    assert req["status"] == "pending"
    request_id = req["id"]

    # Duplicate pending request is rejected.
    duplicate = await client.post(
        f"/api/v1/projects/{source_id}/fork-requests",
        json={"commit_hash": None},
        headers=user_headers,
    )
    assert duplicate.status_code == 400

    # Non-owner cannot approve.
    not_owner_approve = await client.post(
        f"/api/v1/projects/{source_id}/fork-requests/{request_id}/approve",
        headers=user_headers,
    )
    assert not_owner_approve.status_code == 403

    owner_list = await client.get(f"/api/v1/projects/{source_id}/fork-requests", headers=owner_headers)
    assert owner_list.status_code == 200
    assert any(item["id"] == request_id and item["status"] == "pending" for item in owner_list.json())

    approved = await client.post(
        f"/api/v1/projects/{source_id}/fork-requests/{request_id}/approve",
        headers=owner_headers,
    )
    assert approved.status_code == 200
    approved_data = approved.json()
    assert approved_data["status"] == "approved"
    assert isinstance(approved_data.get("approved_project_id"), str) and approved_data["approved_project_id"]

    # Approval is terminal.
    approve_again = await client.post(
        f"/api/v1/projects/{source_id}/fork-requests/{request_id}/approve",
        headers=owner_headers,
    )
    assert approve_again.status_code == 400


@pytest.mark.asyncio
async def test_owner_can_reject_fork_request(client: AsyncClient):
    owner_headers = await _register_and_login(client, "reject_owner@example.com")
    user_headers = await _register_and_login(client, "reject_user@example.com")

    create_res = await client.post(
        "/api/v1/projects/",
        json={"name": "Reject Source", "is_public": True},
        headers=owner_headers,
    )
    source_id = create_res.json()["id"]

    req_res = await client.post(f"/api/v1/projects/{source_id}/fork-requests", json={}, headers=user_headers)
    request_id = req_res.json()["id"]

    reject_res = await client.post(
        f"/api/v1/projects/{source_id}/fork-requests/{request_id}/reject",
        headers=owner_headers,
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "rejected"


@pytest.mark.asyncio
async def test_owner_cannot_create_fork_request_for_self_project(client: AsyncClient):
    owner_headers = await _register_and_login(client, "self_owner@example.com")

    create_res = await client.post(
        "/api/v1/projects/",
        json={"name": "Self Fork Source", "is_public": True},
        headers=owner_headers,
    )
    assert create_res.status_code == 200
    source_id = create_res.json()["id"]

    req_res = await client.post(f"/api/v1/projects/{source_id}/fork-requests", json={}, headers=owner_headers)
    assert req_res.status_code == 400
    assert "owner should use" in req_res.json()["detail"].lower()
