# Smart Attendance System

A web-based smart attendance tracking system developed for Final International University. The system automates student attendance using QR code scanning and facial recognition technology.

## Features

- **QR Code Attendance** — Instructors generate a time-limited QR code for each class session. Students scan it to mark attendance.
- **Facial Recognition** — Students verify their identity via face recognition before scanning the QR code, preventing proxy attendance.
- **Liveness Detection** — Anti-spoofing with challenge-response (move closer/away, raise eyebrows, smile) prevents photo/screen attacks.
- **Dual Security** — School network (IP) check and GPS location verification ensure students are physically present.
- **Google OAuth** — Students sign in with their school email (@final.edu.tr). Supports both Google and email/password login.
- **Role-Based Access** — Three roles: Student, Instructor, and Admin, each with dedicated dashboards.
- **Course Groups** — Courses can have multiple groups (Group 1, Group 2, etc.) with separate schedules and student lists.
- **Automated Notifications** — Students receive alerts when attendance sessions open, close, expire, or when attendance falls below threshold.
- **Export Reports** — Instructors can export attendance reports as Excel or PDF.
- **Timetable Upload** — Admins and instructors can bulk-upload course schedules via Excel.
- **Student List Upload** — Instructors can enroll students in bulk via Excel.
- **System Settings** — Configurable attendance thresholds and QR durations.
- **Face Update Policy** — Students are prompted to re-register their face every 6 months.
- **Dark/Light Mode** — Theme preference stored per session.

## Tech Stack

### Frontend
- React.js
- Bootstrap 5 / React-Bootstrap
- React Router DOM
- Axios
- html5-qrcode
- react-webcam
- react-bootstrap-icons
- recharts
- xlsx
- @react-oauth/google

### Backend
- Node.js + Express
- MySQL (mysql2)
- JWT Authentication
- bcryptjs
- QRCode.js
- Multer
- ExcelJS + PDFKit
- Nodemailer
- Passport (Google OAuth)
- node-cron

### Face Recognition Service
- Python 3.11
- Flask
- DeepFace (Facenet512)
- OpenCV
- TensorFlow

## Project Structure
```
smart-attendance-system/
├── backend/          # Node.js + Express API (port 5000)
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── jobs/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── utils/
├── frontend/         # React.js Web App (port 3000)
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
└── face-service/     # Python Flask Face Recognition API (port 5001)
```

## Installation & Setup

### Prerequisites
- Node.js v18+
- Python 3.11
- MySQL 8.0+

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
ALLOWED_IPS=your_school_network/24,127.0.0.1,::1
SCHOOL_LAT=35.33035655726577
SCHOOL_LNG=33.3615414903061
SCHOOL_RADIUS_METERS=150
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

Run the database migrations in MySQL Workbench using the SQL schema provided in `/backend/database.sql`.

Start the backend:
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
REACT_APP_SCHOOL_LAT=35.33035655726577
REACT_APP_SCHOOL_LNG=33.3615414903061
REACT_APP_SCHOOL_RADIUS=150
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_FACE_SERVICE_URL=http://localhost:5001
```

Start the frontend:
```bash
npm start
```

### Face Recognition Service Setup
```bash
cd face-service
py -3.11 -m venv venv
venv\Scripts\activate
pip install flask flask-cors deepface tf-keras opencv-python numpy pillow
python app.py
```

## Usage

### Admin
- Add users (students, instructors, admins)
- Upload course timetables via Excel (all instructors at once)
- Manage system settings
- Reset student face data

### Instructor
- Create courses with groups and schedules
- Upload course schedule via Excel
- Upload student list via Excel to enroll students in bulk
- Generate QR codes for class sessions
- View and export attendance reports (course-level and session-level)
- Send low attendance alerts to students

### Student
- Sign in with Google school email or email/password
- Register face on first login (3-step: look straight, turn left, turn right)
- Take attendance via face verification + QR scan
- View courses with active/inactive status based on schedule
- View attendance history and statistics
- Receive notifications for sessions and low attendance
- Change password from profile page

## Excel Templates

### Admin — Timetable Upload
| course_code | course_name | instructor_email | semester | attendance_threshold | group_name | day | start_time | end_time |

### Instructor — Schedule Upload
| course_code | course_name | semester | group_name | day | start_time | end_time |

### Instructor — Student List Upload
| student_number |

> For courses with multiple days, add a new row with the same course_code.
> For courses with multiple groups, use group_name column (e.g. 1, 2, A, B).
> Time format: HH:MM (e.g. 09:00)
> Day values: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday

## Database Tables
- `users` — students, instructors, admins
- `courses` — courses with group support (group_name column)
- `course_enrollments` — student-course relationships
- `class_sessions` — QR sessions with expiry tracking (expiry_notified column)
- `attendance_records` — attendance logs
- `notifications` — user notifications
- `system_settings` — configurable system values
- `course_schedules` — weekly schedule per course (day, start_time, end_time)

## Security

- JWT-based authentication
- SessionStorage (prevents multi-tab session conflicts)
- School network (IP) restriction for attendance
- GPS location verification (150m radius)
- Face recognition (DeepFace Facenet512) to prevent proxy attendance
- Liveness detection with anti-spoofing (score threshold: 0.95)
- Challenge-response verification (move closer/away, raise eyebrows, smile)
- Duplicate face detection (prevents registering another student's face)
- QR codes expire after a configurable duration
- Attendance can only be marked during scheduled class hours
- Rate limiting on all API endpoints

## Developer

**Eren Özcan Altın**  
Final International University  
Software Engineering — Capstone Project 2025-2026

