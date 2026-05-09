# Smart Attendance System

A web-based smart attendance tracking system developed for Final International University. The system automates student attendance using QR code scanning and facial recognition with multi-layer liveness detection.

---

## Features

- **QR Code Attendance** — Instructors generate a time-limited QR code for each class session. Students scan it to mark attendance.
- **Facial Recognition** — Students verify their identity via face recognition before scanning the QR code, preventing proxy attendance.
- **Multi-Layer Liveness Detection** — Anti-spoofing pipeline using MiniFASNet, YCrCb skin color analysis, and micro-movement verification to block photo/screen/video attacks.
- **Dual-Challenge Verification** — Two sequential facial challenges (smile, turn left/right, raise eyebrows, close eyes) must both be passed before attendance is marked.
- **Wrong Person Detection** — Embedding comparison during challenge detection blocks someone else from using another student's account.
- **Google OAuth** — Students sign in with their school email (@final.edu.tr). Supports both Google and email/password login.
- **Password Reset** — Forgot password flow with email link and 1-hour expiry token.
- **Role-Based Access** — Three roles: Student, Instructor, and Admin, each with dedicated dashboards.
- **Course Groups** — Courses can have multiple groups (Group 1, Group 2, etc.) with separate schedules and student lists.
- **Course Edit** — Instructors can edit course code, name, semester, attendance threshold, and schedule from the manage course page.
- **Automated Notifications** — Students receive alerts when attendance falls below threshold.
- **Export Reports** — Instructors can export attendance reports as Excel or PDF (course-level and session-level).
- **Timetable Upload** — Admins and instructors can bulk-upload course schedules via Excel.
- **Student List Upload** — Instructors can enroll students in bulk via Excel.
- **Bulk User Import** — Admins can import students and instructors in bulk via separate Excel uploads.
- **System Settings** — Configurable attendance thresholds and QR durations.
- **Face Update Policy** — Students are prompted to re-register their face every 6 months.
- **Dark/Light Mode** — Theme preference stored per session.
- **Mobile Responsive** — All pages include mobile-optimized card views; table views are replaced with card lists on small screens.
- **Pagination** — All list views paginate at 10 items per page.
- **Student Search** — Instructor course management includes live search by student name or number.

---

## Tech Stack

### Frontend
- React 18
- Bootstrap 5 / React-Bootstrap
- React Router DOM
- Axios
- html5-qrcode
- react-webcam
- react-bootstrap-icons
- recharts
- xlsx

### Backend
- Node.js 18 + Express 4
- MySQL 8 (mysql2)
- JWT Authentication
- bcryptjs
- QRCode.js
- Multer
- ExcelJS + PDFKit
- Nodemailer
- Passport (Google OAuth)
- node-cron
- express-rate-limit
- compression
- helmet

### Face Recognition Service
- Python 3.10
- Flask + Flask-CORS
- InsightFace (ArcFace / buffalo_l)
- ONNX Runtime
- MiniFASNet (uniface) — anti-spoofing
- OpenCV
- PostgreSQL (psycopg2) — embedding storage
- Redis — embedding cache
- NumPy / Pillow

---

## Project Structure

```
smart-attendance-system/
├── backend/                  # Node.js + Express API (port 5000)
│   ├── config/
│   ├── controllers/
│   ├── jobs/
│   ├── middleware/
│   ├── routes/
│   └── utils/
├── frontend/                 # React.js Web App (port 3000)
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   ├── auth/         # Login, ForgotPasswordModal, ResetPassword, CompleteRegistration
│   │   │   ├── instructor/
│   │   │   └── student/
│   │   ├── services/
│   │   └── utils/
└── face-service/             # Python Flask Face Recognition API (port 5001)
```

---

## Installation & Setup

### Prerequisites
- Node.js v18+
- Python 3.10+
- MySQL 8.0+
- PostgreSQL 15+
- Redis 7+

### Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_attendance
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
NODE_ENV=development
FACE_SERVICE_URL=http://localhost:5001
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail
SMTP_PASS=your_app_password
SMTP_FROM=your_gmail
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SCHOOL_DOMAIN=final.edu.tr
FRONTEND_URL=http://localhost:3000
```

Run database migrations:
```bash
# MySQL
mysql -u root -p smart_attendance < backend/database.sql

# PostgreSQL (face embeddings)
psql -U postgres -d smart_attendance_faces -c "
CREATE TABLE IF NOT EXISTS face_embeddings (
  id SERIAL PRIMARY KEY,
  student_uuid VARCHAR(36) NOT NULL,
  step INT NOT NULL,
  embedding BYTEA NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_uuid, step)
);"

# Password reset tokens (MySQL)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Start backend:
```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_FACE_SERVICE_URL=http://localhost:5001
REACT_APP_SCHOOL_DOMAIN=final.edu.tr
```

Start frontend:
```bash
npm start
```

### Face Recognition Service Setup

```bash
cd face-service
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

pip install flask flask-cors insightface onnxruntime uniface \
            opencv-python numpy pillow psycopg2-binary redis
python app.py
```

Face service environment variables (optional, defaults shown):
```env
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=smart_attendance_faces
PG_USER=postgres
PG_PASSWORD=
REDIS_URL=redis://localhost:6379/0
```

---

## Usage

### Admin
- Add individual users (students, instructors, admins)
- **Import students in bulk via Excel** (full_name, email, password, student_number)
- **Import instructors in bulk via Excel** (full_name, email, password)
- Upload course timetables via Excel
- Manage and activate/deactivate users and courses
- Reset individual or all student face data
- Configure system settings

### Instructor
- Create courses with groups and schedules
- **Edit course details** (code, name, semester, threshold, schedule)
- Upload course schedule via Excel
- Upload student list via Excel to enroll students in bulk
- **Search students** by name or number in the course management page
- Generate QR codes for class sessions
- View and export attendance reports (course-level and session-level)
- Send low attendance alerts to students

### Student
- Sign in with Google school email or email/password
- **Forgot password** — receive a reset link via email
- Register face on first login (3-step: look straight, turn left, turn right)
- Take attendance via face verification + QR scan
- View courses with active/inactive/upcoming status based on schedule
- View attendance history and statistics with charts
- Receive notifications for low attendance
- Change password from profile page

---

## Excel Templates

### Admin — Timetable Upload
| course_code | course_name | instructor_email | semester | attendance_threshold | group_name | day | start_time | end_time |

### Instructor — Schedule Upload
| course_code | course_name | semester | group_name | day | start_time | end_time |

### Instructor — Student List Upload
| student_number |

### Admin — Student Import
| full_name | email | password | student_number |

### Admin — Instructor Import
| full_name | email | password |

> For courses with multiple days, add a new row with the same course_code.  
> For courses with multiple groups, use the group_name column (e.g. 1, 2, A, B).  
> Time format: HH:MM (e.g. 09:00)  
> Day values: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday

---

## Database Tables

| Table | Description |
|---|---|
| users | Students, instructors, admins |
| courses | Courses with group support |
| course_enrollments | Student-course relationships |
| class_sessions | QR sessions with expiry tracking |
| attendance_records | Attendance logs with method (qr / face) |
| notifications | User notifications |
| system_settings | Configurable system values |
| course_schedules | Weekly schedule per course |
| password_reset_tokens | Email-based password reset tokens (1h expiry) |
| face_embeddings | ArcFace embeddings (PostgreSQL, 3 per student) |

---

## Security

- JWT-based stateless authentication
- SessionStorage (prevents multi-tab session conflicts)
- Role-based access control (RBAC) enforced at route level
- Face recognition (InsightFace ArcFace) to prevent proxy attendance
- Multi-layer liveness detection:
  - MiniFASNet anti-spoofing (real_prob threshold: 0.20)
  - YCrCb skin color analysis
  - 106-point landmark micro-movement analysis
- Wrong person detection during challenge phase
- Dual-challenge verification (two sequential facial actions required)
- Duplicate face detection (prevents registering another student's face)
- QR codes expire after a configurable duration
- Password reset via email token (1-hour expiry)
- Rate limiting on all API endpoints
- bcrypt password hashing
- CORS restricted to frontend origin in production
- Face embeddings stored in a separate PostgreSQL database, not accessible from the internet
- Redis caching for embedding lookups (5-minute TTL)

---

## Developer

**Eren Özcan Altın**  
Final International University  
Software Engineering — Capstone Project 2025–2026  
GitHub: [ernzcnltn/Smart-Attendance-System](https://github.com/ernzcnltn/Smart-Attendance-System)