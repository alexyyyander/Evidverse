import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient, db_session):
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "newuser@example.com", "password": "newpassword123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert "id" in data
    assert "password" not in data

@pytest.mark.asyncio
async def test_login_user(client: AsyncClient, db_session):
    # Register first
    await client.post(
        "/api/v1/auth/register",
        json={"email": "loginuser@example.com", "password": "password123"},
    )
    
    # Login
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "loginuser@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_read_users_me(client: AsyncClient, db_session):
    # Register
    await client.post(
        "/api/v1/auth/register",
        json={"email": "me@example.com", "password": "password123"},
    )
    
    # Login
    login_res = await client.post(
        "/api/v1/auth/login",
        data={"username": "me@example.com", "password": "password123"},
    )
    token = login_res.json()["access_token"]
    
    # Get Me
    response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
