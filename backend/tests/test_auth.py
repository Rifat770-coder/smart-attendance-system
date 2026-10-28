import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    res = await client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_login_success(client):
    res = await client.post("/api/v1/auth/login", json={
        "email": "teacher@attendx.edu",
        "password": "Teacher@123456",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["message"] == "Login successful"
    assert "TEACHER" in data["user"]["roles"]
    assert "attendx_session" in res.cookies


@pytest.mark.asyncio
async def test_login_invalid_password(client):
    res = await client.post("/api/v1/auth/login", json={
        "email": "teacher@attendx.edu",
        "password": "WrongPassword123!",
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


@pytest.mark.asyncio
async def test_me_endpoint_authenticated(teacher_client):
    res = await teacher_client.get("/api/v1/auth/me")
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "teacher@attendx.edu"
    assert data["teacher_profile"] is not None


@pytest.mark.asyncio
async def test_unauthenticated_request_blocked(client):
    client.cookies.clear()
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401
