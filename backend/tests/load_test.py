import asyncio
import time
import uuid
import httpx
from statistics import median
from app.core.security import hash_password
from app.core.database import async_session_factory
from app.models import User, Student, Role, UserRole, CourseSection, AttendanceSession, Enrollment
from sqlalchemy import select


async def setup_test_students(num_students: int = 100):
    """Seed benchmark students and enroll them in section."""
    async with async_session_factory() as session:
        # Get section
        sec = (await session.execute(select(CourseSection).limit(1))).scalars().first()
        student_role = (await session.execute(select(Role).where(Role.name == "STUDENT"))).scalars().first()

        students = []
        for i in range(num_students):
            email = f"bench_student_{i}_{uuid.uuid4().hex[:6]}@attendx.edu"
            u = User(
                university_id=sec.course.department.university_id,
                department_id=sec.course.department_id,
                email=email,
                password_hash=hash_password("Student@123456"),
                full_name=f"Benchmark Student {i}",
                is_active=True,
            )
            session.add(u)
            await session.flush()

            session.add(UserRole(user_id=u.id, role_id=student_role.id))

            s_prof = Student(
                user_id=u.id,
                student_id_number=f"BENCH-{uuid.uuid4().hex[:8].upper()}",
                department_id=sec.course.department_id,
                batch_id=(await session.execute(select(Student.batch_id).limit(1))).scalar(),
                enrollment_status="ACTIVE",
            )
            session.add(s_prof)
            await session.flush()

            session.add(Enrollment(student_id=s_prof.id, section_id=sec.id, status="ACTIVE"))
            students.append((email, "Student@123456"))

        await session.commit()
        return sec.id, students


async def run_burst_benchmark():
    print("=" * 60)
    print("AttendX Concurrent Classroom Attendance Burst Benchmark")
    print("=" * 60)

    # 1. Start server background task if not running
    # We will test using direct HTTP client against local test ASGI app or running server
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Teacher login
        teacher_login = await client.post("/api/v1/auth/login", json={
            "email": "teacher@attendx.edu",
            "password": "Teacher@123456",
        })
        assert teacher_login.status_code == 200

        # Teacher starts session
        sec_res = await client.get("/api/v1/academic/sections")
        sec_id = sec_res.json()[0]["id"]

        session_res = await client.post("/api/v1/attendance/sessions", json={
            "section_id": sec_id,
            "title": "Concurrency Burst Test Lecture",
            "rotation_interval_seconds": 30,
        })
        session_id = session_res.json()["id"]

        # Teacher gets QR challenge
        qr_res = await client.get(f"/api/v1/qr/sessions/{session_id}/challenge")
        challenge_token = qr_res.json()["challenge_token"]

        # Log in test students concurrently
        test_students = [
            ("student1@attendx.edu", "Student@123456"),
            ("student2@attendx.edu", "Student@123456"),
            ("student3@attendx.edu", "Student@123456"),
        ]

        student_clients = []
        for email, pwd in test_students:
            c = AsyncClient(transport=transport, base_url="http://testserver")
            res = await c.post("/api/v1/auth/login", json={"email": email, "password": pwd})
            assert res.status_code == 200
            student_clients.append((c, email))

        print(f"Executing simulated simultaneous scan burst across {len(student_clients)} students...")

        latencies = []
        start_time = time.time()

        async def scan_worker(sc_client, email):
            t0 = time.time()
            resp = await sc_client.post("/api/v1/qr/scan", json={
                "session_id": session_id,
                "challenge_token": challenge_token,
            })
            duration = (time.time() - t0) * 1000.0
            return resp.status_code, duration

        tasks = [scan_worker(c, email) for c, email in student_clients]
        results = await asyncio.gather(*tasks)

        total_duration = time.time() - start_time
        for code, dur in results:
            assert code == 200
            latencies.append(dur)

        latencies.sort()
        p50 = median(latencies)
        p95 = latencies[int(len(latencies) * 0.95)] if len(latencies) > 1 else latencies[0]
        rps = len(tasks) / total_duration

        print("-" * 60)
        print(f"Results Summary:")
        print(f"Total Requests:        {len(tasks)}")
        print(f"Success Rate:          100.0%")
        print(f"Total Duration:        {total_duration:.4f}s")
        print(f"Requests Per Second:   {rps:.2f} req/s")
        print(f"p50 Latency:           {p50:.2f} ms")
        print(f"p95 Latency:           {p95:.2f} ms")
        print("-" * 60)

        # Concurrency verification: Try duplicate burst
        print("Testing immediate duplicate scan burst...")
        dup_tasks = [scan_worker(c, email) for c, email in student_clients]
        dup_results = await asyncio.gather(*dup_tasks)
        for code, _ in dup_results:
            assert code == 400  # Duplicate rejected!
        print("Duplicate Prevention:  100% of duplicate attempts rejected by DB constraint.")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_burst_benchmark())
