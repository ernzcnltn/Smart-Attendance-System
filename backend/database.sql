CREATE DATABASE IF NOT EXISTS smart_attendance
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_attendance;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'instructor', 'admin') NOT NULL,
  student_number VARCHAR(20) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  face_registered BOOLEAN DEFAULT FALSE,
  face_registered_at TIMESTAMP NULL,
  face_image_path VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  course_code VARCHAR(20) NOT NULL UNIQUE,
  course_name VARCHAR(150) NOT NULL,
  instructor_id INT NOT NULL,
  semester VARCHAR(20) NOT NULL,
  attendance_threshold INT DEFAULT 70,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE course_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_enrollment (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE class_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  course_id INT NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  qr_token VARCHAR(255) NULL,
  qr_expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE attendance_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  session_id INT NOT NULL,
  marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  method ENUM('qr', 'face', 'manual') DEFAULT 'qr',
  is_present BOOLEAN DEFAULT TRUE,
  UNIQUE KEY unique_attendance (student_id, session_id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES class_sessions(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('default_attendance_threshold', '70', 'Default attendance threshold percentage for new courses'),
('qr_duration_minutes', '15', 'Default QR code duration in minutes'),
('low_attendance_alert_enabled', 'true', 'Enable automatic low attendance alerts');