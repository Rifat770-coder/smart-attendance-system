import asyncio
import uuid
import datetime as dt
from sqlalchemy import select
from app.core.database import async_session_factory
from app.core.security import hash_password
from app.models import (
    University,
    Department,
    AcademicYear,
    Semester,
    Batch,
    Course,
    CourseSection,
    TeacherAssignment,
    Enrollment,
    ClassSchedule,
    Role,
    User,
    UserRole,
    Student,
    Teacher,
    AttendancePolicy,
    NotificationPreference,
)


async def seed_database():
    async with async_session_factory() as session:
        # Check if already seeded
        res = await session.execute(select(University).limit(1))
        if res.scalars().first():
            print("Database already seeded. Skipping.")
            return

        print("Seeding AttendX database...")

        # 1. Create Roles
        roles_data = [
            ("SUPER_ADMIN", "Super Administrator with global university privileges", {"all": True}),
            ("DEPT_ADMIN", "Department Administrator", {"department:manage": True, "attendance:audit": True}),
            ("TEACHER", "Faculty Instructor", {"session:manage": True, "attendance:mark": True, "reports:view": True}),
            ("STUDENT", "Enrolled University Student", {"attendance:scan": True, "reports:view_self": True}),
        ]
        roles_map = {}
        for name, desc, perms in roles_data:
            role = Role(name=name, description=desc, permissions=perms)
            session.add(role)
            roles_map[name] = role

        await session.flush()

        # 2. Create University
        university = University(
            name="Apex Institute of Science and Technology",
            code="AIST",
            domain="aist.edu",
            address="100 Innovation Way, Tech Valley",
            settings={"allow_student_self_registration": False, "qr_refresh_rate": 10},
        )
        session.add(university)
        await session.flush()

        # 3. Create Department
        dept_cse = Department(
            university_id=university.id,
            name="Computer Science & Engineering",
            code="CSE",
        )
        dept_eee = Department(
            university_id=university.id,
            name="Electrical & Electronics Engineering",
            code="EEE",
        )
        session.add_all([dept_cse, dept_eee])
        await session.flush()

        # 4. Create Attendance Policy
        policy = AttendancePolicy(
            department_id=dept_cse.id,
            minimum_percentage=75.0,
            late_weight=0.5,
            allowed_late_minutes=15,
            grace_period_seconds=5,
        )
        session.add(policy)

        # 5. Create Academic Year and Semester
        academic_year = AcademicYear(
            university_id=university.id,
            year_name="2026-2027",
            start_date=dt.date(2026, 8, 1),
            end_date=dt.date(2027, 7, 31),
            is_current=True,
        )
        session.add(academic_year)
        await session.flush()

        semester = Semester(
            academic_year_id=academic_year.id,
            name="Fall 2026",
            code="FALL2026",
            start_date=dt.date(2026, 9, 1),
            end_date=dt.date(2027, 1, 31),
            is_active=True,
        )
        session.add(semester)
        await session.flush()

        # 6. Create Batch
        batch = Batch(
            department_id=dept_cse.id,
            name="CSE-2024",
            start_year=2024,
            end_year=2028,
        )
        session.add(batch)
        await session.flush()

        # 7. Create Users & Profiles
        # Super Admin
        super_admin_user = User(
            university_id=university.id,
            email="superadmin@attendx.edu",
            password_hash=hash_password("Admin@123456"),
            full_name="Dr. Eleanor Vance",
            phone="+1-555-0100",
            is_active=True,
        )
        session.add(super_admin_user)
        await session.flush()
        session.add(UserRole(user_id=super_admin_user.id, role_id=roles_map["SUPER_ADMIN"].id))

        # Dept Admin
        dept_admin_user = User(
            university_id=university.id,
            department_id=dept_cse.id,
            email="deptadmin@attendx.edu",
            password_hash=hash_password("DeptAdmin@123456"),
            full_name="Prof. Arthur Pendelton",
            phone="+1-555-0101",
            is_active=True,
        )
        session.add(dept_admin_user)
        await session.flush()
        session.add(UserRole(user_id=dept_admin_user.id, role_id=roles_map["DEPT_ADMIN"].id))
        dept_cse.head_user_id = dept_admin_user.id

        # Teacher
        teacher_user = User(
            university_id=university.id,
            department_id=dept_cse.id,
            email="teacher@attendx.edu",
            password_hash=hash_password("Teacher@123456"),
            full_name="Dr. Alan Turing",
            phone="+1-555-0102",
            is_active=True,
        )
        session.add(teacher_user)
        await session.flush()
        session.add(UserRole(user_id=teacher_user.id, role_id=roles_map["TEACHER"].id))
        
        teacher_profile = Teacher(
            user_id=teacher_user.id,
            employee_id_number="EMP-CSE-001",
            department_id=dept_cse.id,
            designation="Associate Professor",
        )
        session.add(teacher_profile)
        await session.flush()

        # Students
        students_info = [
            ("student1@attendx.edu", "Alice Smith", "CSE-2024-001", "+1-555-0201"),
            ("student2@attendx.edu", "Bob Johnson", "CSE-2024-002", "+1-555-0202"),
            ("student3@attendx.edu", "Charlie Davis", "CSE-2024-003", "+1-555-0203"),
        ]
        student_records = []
        for email, name, s_id, phone in students_info:
            s_user = User(
                university_id=university.id,
                department_id=dept_cse.id,
                email=email,
                password_hash=hash_password("Student@123456"),
                full_name=name,
                phone=phone,
                is_active=True,
            )
            session.add(s_user)
            await session.flush()
            session.add(UserRole(user_id=s_user.id, role_id=roles_map["STUDENT"].id))
            session.add(NotificationPreference(user_id=s_user.id, email_enabled=True, in_app_enabled=True, min_threshold_alert=75.0))

            s_profile = Student(
                user_id=s_user.id,
                student_id_number=s_id,
                department_id=dept_cse.id,
                batch_id=batch.id,
                enrollment_status="ACTIVE",
            )
            session.add(s_profile)
            student_records.append(s_profile)

        await session.flush()

        # 8. Create Course & Section
        course_dsa = Course(
            department_id=dept_cse.id,
            semester_id=semester.id,
            code="CS101",
            name="Data Structures and Algorithms",
            credits=4.0,
            description="Fundamental data structures and algorithmic problem solving",
        )
        course_os = Course(
            department_id=dept_cse.id,
            semester_id=semester.id,
            code="CS102",
            name="Operating Systems Concepts",
            credits=3.0,
            description="Processes, concurrency, memory management, and file systems",
        )
        session.add_all([course_dsa, course_os])
        await session.flush()

        section_dsa_a = CourseSection(
            course_id=course_dsa.id,
            semester_id=semester.id,
            section_name="Section A",
            capacity=60,
        )
        session.add(section_dsa_a)
        await session.flush()

        # 9. Assign Teacher
        assignment = TeacherAssignment(
            teacher_id=teacher_profile.id,
            section_id=section_dsa_a.id,
            is_primary=True,
        )
        session.add(assignment)

        # 10. Enroll Students
        for s in student_records:
            enrollment = Enrollment(
                student_id=s.id,
                section_id=section_dsa_a.id,
                status="ACTIVE",
            )
            session.add(enrollment)

        # 11. Schedule
        schedule1 = ClassSchedule(
            section_id=section_dsa_a.id,
            day_of_week="MONDAY",
            start_time=dt.time(10, 0),
            end_time=dt.time(11, 30),
            room_number="Lab-301",
        )
        schedule2 = ClassSchedule(
            section_id=section_dsa_a.id,
            day_of_week="WEDNESDAY",
            start_time=dt.time(10, 0),
            end_time=dt.time(11, 30),
            room_number="Lab-301",
        )
        session.add_all([schedule1, schedule2])

        await session.commit()
        print("AttendX database seeded successfully with initial users, courses, and schedules!")


if __name__ == "__main__":
    asyncio.run(seed_database())
