import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import engine


@pytest_asyncio.fixture(scope="session")
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest_asyncio.fixture(scope="session")
async def teacher_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.post("/api/v1/auth/login", json={
            "email": "teacher@attendx.edu",
            "password": "Teacher@123456",
        })
        assert resp.status_code == 200, f"Teacher login failed: {resp.text}"
        yield ac


@pytest_asyncio.fixture(scope="session")
async def student_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.post("/api/v1/auth/login", json={
            "email": "student1@attendx.edu",
            "password": "Student@123456",
        })
        assert resp.status_code == 200, f"Student login failed: {resp.text}"
        yield ac


@pytest_asyncio.fixture(scope="session")
async def student2_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.post("/api/v1/auth/login", json={
            "email": "student2@attendx.edu",
            "password": "Student@123456",
        })
        assert resp.status_code == 200, f"Student 2 login failed: {resp.text}"
        yield ac


@pytest_asyncio.fixture(scope="session")
async def admin_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.post("/api/v1/auth/login", json={
            "email": "superadmin@attendx.edu",
            "password": "Admin@123456",
        })
        assert resp.status_code == 200, f"Admin login failed: {resp.text}"
        yield ac
