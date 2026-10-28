import pytest


@pytest.mark.asyncio
async def test_full_attendance_lifecycle(teacher_client, student_client, student2_client):
    # 1. Teacher retrieves sections
    sections_res = await teacher_client.get("/api/v1/academic/sections")
    assert sections_res.status_code == 200
    sections = sections_res.json()
    assert len(sections) > 0
    section_id = sections[0]["id"]

    # 2. Teacher creates an attendance session
    create_res = await teacher_client.post("/api/v1/attendance/sessions", json={
        "section_id": section_id,
        "title": "Algorithms Lecture - Binary Search Trees",
        "rotation_interval_seconds": 10,
    })
    assert create_res.status_code == 200
    session_data = create_res.json()
    session_id = session_data["id"]
    assert session_data["state"] == "ACTIVE"

    # 3. Teacher generates rotating QR challenge
    qr_res = await teacher_client.get(f"/api/v1/qr/sessions/{session_id}/challenge")
    assert qr_res.status_code == 200
    challenge_data = qr_res.json()
    assert challenge_data["challenge_token"] is not None
    challenge_token = challenge_data["challenge_token"]
    assert challenge_data["is_active"] is True

    # 4. Student 1 scans the QR challenge
    scan_res = await student_client.post("/api/v1/qr/scan", json={
        "session_id": session_id,
        "challenge_token": challenge_token,
    })
    assert scan_res.status_code == 200, f"Scan failed: {scan_res.text}"
    record1 = scan_res.json()
    assert record1["status"] in ("PRESENT", "LATE")
    assert record1["verification_method"] == "DYNAMIC_QR"
    record1_id = record1["id"]

    # 5. Duplicate attendance rejection: Student 1 tries scanning again
    dup_res = await student_client.post("/api/v1/qr/scan", json={
        "session_id": session_id,
        "challenge_token": challenge_token,
    })
    assert dup_res.status_code == 400
    assert "already" in dup_res.json()["detail"].lower()

    # 6. Student 2 scans the SAME active challenge (challenge is not consumed on first use)
    scan2_res = await student2_client.post("/api/v1/qr/scan", json={
        "session_id": session_id,
        "challenge_token": challenge_token,
    })
    assert scan2_res.status_code == 200
    record2 = scan2_res.json()
    assert record2["status"] in ("PRESENT", "LATE")

    # 7. Invalid/Forged challenge is rejected
    fake_res = await student_client.post("/api/v1/qr/scan", json={
        "session_id": session_id,
        "challenge_token": "completely_fake_token_12345",
    })
    assert fake_res.status_code == 400

    # 8. Teacher pauses attendance session
    pause_res = await teacher_client.patch(f"/api/v1/attendance/sessions/{session_id}/state", json={
        "state": "PAUSED",
    })
    assert pause_res.status_code == 200
    assert pause_res.json()["state"] == "PAUSED"

    # 9. Attendance rejected during PAUSED state
    paused_scan_res = await student_client.post("/api/v1/qr/scan", json={
        "session_id": session_id,
        "challenge_token": challenge_token,
    })
    assert paused_scan_res.status_code == 400
    assert "PAUSED" in paused_scan_res.json()["detail"]

    # 10. Teacher resumes session to ACTIVE
    resume_res = await teacher_client.patch(f"/api/v1/attendance/sessions/{session_id}/state", json={
        "state": "ACTIVE",
    })
    assert resume_res.status_code == 200
    assert resume_res.json()["state"] == "ACTIVE"

    # 11. Teacher ends attendance session (COMPLETED)
    end_res = await teacher_client.patch(f"/api/v1/attendance/sessions/{session_id}/state", json={
        "state": "COMPLETED",
    })
    assert end_res.status_code == 200
    assert end_res.json()["state"] == "COMPLETED"

    # 12. Attendance rejected after session closure
    closed_scan_res = await student_client.post("/api/v1/qr/scan", json={
        "session_id": session_id,
        "challenge_token": challenge_token,
    })
    assert closed_scan_res.status_code == 400
    assert "COMPLETED" in closed_scan_res.json()["detail"]

    # 13. Verify live records list
    records_res = await teacher_client.get(f"/api/v1/attendance/sessions/{session_id}/records")
    assert records_res.status_code == 200
    records_list = records_res.json()
    assert len(records_list) >= 2

    # 14. Verify student calculated summary
    summary_res = await student_client.get("/api/v1/reports/student/summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["overall_percentage"] > 0
    assert summary["total_eligible_sessions"] >= 1

    # 15. Attendance correction request by Student
    correction_req = await student_client.post("/api/v1/corrections", json={
        "record_id": record1_id,
        "requested_status": "EXCUSED",
        "reason": "Had approved medical leave appointment",
    })
    assert correction_req.status_code == 200
    corr_id = correction_req.json()["id"]

    # 16. Teacher approves correction request
    review_res = await teacher_client.post(f"/api/v1/corrections/{corr_id}/review", json={
        "status": "APPROVED",
        "justification": "Verified medical certificate with clinic",
    })
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "APPROVED"
