# AttendX — Production-Ready Smart University Attendance Management System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_14_App_Router-black?logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_15-336791?logo=postgresql)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Cache-Redis_7-DC382D?logo=redis)](https://redis.io)
[![Docker](https://img.shields.io/badge/Deploy-Docker_Compose-2496ED?logo=docker)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

AttendX is a full-stack, enterprise-grade university attendance management platform built with a **modular monolith architecture**, strict database transactional guarantees, dynamic cryptographically rotating QR codes, real-time WebSocket telemetry, and complete role-based access control (RBAC).

---

## 🏛️ System Architecture

```
                                  ┌───────────────────────┐
                                  │      Web Browser      │
                                  │   (Desktop & Mobile)  │
                                  └──────────┬────────────┘
                                             │ HTTPS / WSS
                                             ▼
                                  ┌───────────────────────┐
                                  │   Nginx Reverse Proxy │
                                  │   (Rate Limiting/SSL) │
                                  └─────┬───────────┬─────┘
                     HTTP / API Requests│           │WebSocket / Real-time Feed
                                        ▼           ▼
   ┌────────────────────────────────────────────────────────┐
   │                  Next.js 14 Frontend                   │
   │  (App Router, React 18, TanStack Query, Tailwind CSS)  │
   └────────────────────────────┬───────────────────────────┘
                                │ Proxied REST & WS
                                ▼
   ┌────────────────────────────────────────────────────────┐
   │                  FastAPI Backend Core                  │
   │      (Pydantic v2, SQLAlchemy 2.0, Argon2id, Auth)     │
   └─────────────┬──────────────────────────┬───────────────┘
                 │                          │
                 ▼                          ▼
   ┌──────────────────────────┐  ┌──────────────────────────┐
   │   PostgreSQL Database    │  │       Redis Server       │
   │  - Authoritative State   │  │  - Transient QR TTL      │
   │  - Mathematical Aggs     │  │  - Pub/Sub Real-time     │
   │  - Audit Trail & Logs    │  │  - Session Blacklist     │
   └──────────────────────────┘  └──────────┬───────────────┘
                                            │
                                            ▼
                                 ┌───────────────────────┐
                                 │     Celery Worker     │
                                 │ (Async Notifications) │
                                 └───────────────────────┘
```

---

## 🌟 Key Highlights & Engineering Design

### 1. Dynamic Rotating QR Security System
- **Ephemeral State in Redis**: QR challenges contain cryptographically random 32-byte tokens with a strict Time-To-Live (TTL default: 15s) and sequence counter.
- **Authoritative PostgreSQL State Machine**: Attendance sessions strictly follow state transitions:
  `SCHEDULED` ➔ `ACTIVE` ⇄ `PAUSED` ➔ `COMPLETED` / `CANCELLED`.
  If a session is paused or completed, any scan attempt is immediately rejected, even if the QR token has not technically expired.
- **Duplicate Prevention**: Enforced via PostgreSQL composite unique database constraint:
  `UNIQUE (session_id, student_id)`.
- **Concurrent Burst Resilience**: Tokens are reusable by all legitimately enrolled students during their active window. Concurrency load testing verifies sub-500ms response times under simultaneous scans with 0% duplicate leak.
- **Physical Presence Disclaimer**: Dynamic QR codes protect against code duplication and remote photo replay, but university policy should combine QR with randomized sequence rotation or teacher oversight.

### 2. Mathematically Rigorous Attendance Calculations
Attendance compliance is computed with exact denominator semantics:
$$\text{Attendance Rate} = \left(\frac{\text{Present} + (\text{Late} \times \text{Late Weight})}{\text{Total Completed Sessions}}\right) \times 100$$
- Unscheduled, scheduled future, or cancelled classes are excluded from the denominator.
- Excused absences are handled per department policy.
- Automated triggers flag students falling below the department compliance threshold (default: 75%).

### 3. Server-Side Session Security & RBAC
- **Argon2id** password hashing.
- **HttpOnly, Secure, SameSite=Lax** session cookies (immune to XSS token theft).
- **Session Expiry & Invalidation**: Revoked instantly in PostgreSQL and blacklisted in Redis.
- **4 Discrete University Roles**: `STUDENT`, `TEACHER`, `DEPT_ADMIN`, `SUPER_ADMIN`.

---

## 👥 Role Capabilities

### 👨‍🎓 Student
- Dynamic camera QR code scanner with instant visual verification.
- Real-time overall and course-by-course attendance percentages.
- Weekly class timetable & routine.
- Historical attendance records with status filters (`PRESENT`, `LATE`, `ABSENT`, `EXCUSED`).
- Attendance correction submission workflow with student reason input.
- Real-time notification center for low attendance alerts and review updates.

### 👩‍🏫 Teacher
- Assigned course sections overview with cohort capacities.
- Launch attendance sessions with customizable QR rotation interval (5s – 20s).
- Live attendance session room with animated countdown ring, sequence tracking, and fullscreen display.
- Real-time WebSocket live feed showing student scans as they occur.
- Pause, Resume, and Complete session controls.
- Manual attendance override dialog with justification logging.
- Attendance correction review interface (Approve / Reject with audit justifications).
- Multi-format report exports: **CSV**, **XLSX (openpyxl)**, and **PDF (ReportLab)**.

### 🏢 Department Admin
- Department operations overview with key faculty and student metrics.
- User directory management with real-time account suspension/reactivation.
- Academic curriculum management: create courses and section cohorts.
- Bulk student enrollment via CSV upload with validation reporting and sample template download.
- Department attendance compliance policy configuration (minimum percentage, late penalty weight, allowed late minutes, grace period).

### 🛡️ Super Admin
- System health telemetry dashboard: PostgreSQL latency, Redis latency, active rooms, total users.
- Global user and role administration across all departments.
- System audit trail with expandable JSON payload mutation diffs.
- Security event logging: suspicious scans, failed authentication, administrative suspensions.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.8+ or 3.11+
- Node.js 18+ & npm
- PostgreSQL 12+
- Redis 5+

### 1. Database & Cache
Ensure PostgreSQL and Redis are running locally on their default ports (5432 and 6379).

### 2. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations and seed data
alembic upgrade head
python -m app.db.seed

# Start backend API server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be live at: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run build
npm run start
```
Frontend Web Portal will be live at: `http://localhost:3000`

---

## 🔑 Pre-Seeded Demonstration Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `superadmin@attendx.edu` | `Admin@123456` |
| **Department Admin** | `deptadmin@attendx.edu` | `DeptAdmin@123456` |
| **Teacher** | `teacher@attendx.edu` | `Teacher@123456` |
| **Student 1** | `student1@attendx.edu` | `Student@123456` |
| **Student 2** | `student2@attendx.edu` | `Student@123456` |
| **Student 3** | `student3@attendx.edu` | `Student@123456` |

*Quick login buttons are also available on the `/login` page for testing.*

---

## 🐳 Production Deployment with Docker Compose

To deploy the entire production stack (Nginx, Next.js, FastAPI, Celery, PostgreSQL, Redis):

```bash
# 1. Clone repository & configure environment
cp .env.example .env

# 2. Build and launch containers
docker compose up -d --build

# 3. Apply database schema and seed
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.db.seed

# 4. Verify cluster health
docker compose ps
curl http://localhost/api/v1/admin/health
```

---

## 🧪 Test Verification

### Backend Pytest Suite
Run the unit and integration tests covering authentication, session state transitions, dynamic QR challenge rotations, duplicate prevention, and report generation:
```bash
cd backend
./venv/bin/pytest -v
```

### Concurrency Load Test
Run the concurrent load testing script simulating simultaneous multi-student scans:
```bash
cd backend
./venv/bin/python tests/load_test.py
```

### Automated Database Backups
```bash
# Run automated backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh backups/attendx_backup_YYYYMMDD_HHMMSS.sql.gz
```

---

## 📄 License
This project is licensed under the MIT License.
