# Smart Attendance System

A web-based smart attendance tracking system developed for Final International University. The system automates student attendance using QR code scanning and facial recognition technology.

## Features

- **QR Code Attendance** — Instructors generate a time-limited QR code for each class session. Students scan it to mark attendance.
- **Facial Recognition** — Students verify their identity via face recognition before scanning the QR code, preventing proxy attendance.
- **Dual Security** — School network (IP) check and GPS location verification ensure students are physically present.
- **Role-Based Access** — Three roles: Student, Instructor, and Admin, each with dedicated dashboards.
- **Automated Notifications** — Students receive alerts when their attendance falls below the threshold.
- **Export Reports** — Instructors can export attendance reports as Excel or PDF.
- **Timetable Upload** — Admins can bulk-upload course schedules via CSV.
- **System Settings** — Configurable attendance thresholds and QR durations.
- **Face Update Policy** — Students are prompted to re-register their face every 6 months.

## Tech Stack

### Frontend
- React.js
- Bootstrap 5 / React-Bootstrap
- React Router DOM
- Axios
- html5-qrcode
- react-webcam
- react-bootstrap-icons

### Backend
- Node.js + Express
- MySQL (mysql2)
- JWT Authentication
- bcryptjs
- QRCode.js
- Multer
- ExcelJS + PDFKit

### Face Recognition Service
- Python 3.11
- Flask
- DeepFace (Facenet512)
- OpenCV
- TensorFlow

## Project Structure
```
smart-attendance-system/
├── backend/          # Node.js + Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── utils/
├── frontend/         # React.js Web App
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
└── face-service/     # Python Flask Face Recognition API
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
- Upload course timetables via CSV
- Manage system settings
- Reset student face data

### Instructor
- Create courses and enroll students
- Generate QR codes for class sessions
- View and export attendance reports
- Send low attendance alerts

### Student
- Register face on first login
- Take attendance via face verification + QR scan
- View attendance history
- Receive low attendance notifications

## Security

- JWT-based authentication
- School network (IP) restriction for attendance
- GPS location verification (150m radius)
- Face recognition to prevent proxy attendance
- QR codes expire after a configurable duration
- Attendance can only be marked during scheduled class hours

## Developer

**Eren Özcan Altın**  
Final International University  
Software Engineering — Capstone Project 2025-2026