import pytest


@pytest.mark.asyncio
async def test_system_health(client):
    res = await client.get("/api/v1/admin/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"]["status"] == "connected"
    assert data["redis"]["status"] == "connected"


@pytest.mark.asyncio
async def test_audit_logs(admin_client):
    res = await admin_client.get("/api/v1/admin/audit-logs")
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)


@pytest.mark.asyncio
async def test_report_exports(teacher_client):
    sections_res = await teacher_client.get("/api/v1/academic/sections")
    sections = sections_res.json()
    section_id = sections[0]["id"]

    # Test CSV export
    csv_res = await teacher_client.get(f"/api/v1/reports/section/{section_id}/export?format=csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "AttendX - Attendance Report" in csv_res.text

    # Test XLSX export
    xlsx_res = await teacher_client.get(f"/api/v1/reports/section/{section_id}/export?format=xlsx")
    assert xlsx_res.status_code == 200
    assert "application/vnd.openxmlformats" in xlsx_res.headers["content-type"]
    assert len(xlsx_res.content) > 100

    # Test PDF export
    pdf_res = await teacher_client.get(f"/api/v1/reports/section/{section_id}/export?format=pdf")
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers["content-type"]
    assert pdf_res.content.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_notifications_workflow(student_client):
    res = await student_client.get("/api/v1/notifications")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    unread_res = await student_client.get("/api/v1/notifications/unread-count")
    assert unread_res.status_code == 200
    assert "unread_count" in unread_res.json()
