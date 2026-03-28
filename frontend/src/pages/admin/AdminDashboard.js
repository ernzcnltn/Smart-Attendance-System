import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Spinner, Alert, Tabs, Tab, Modal, Form } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  getStats,
  getAllUsers,
  toggleUserStatus,
  deleteUser,
  getAllCoursesAdmin,
  toggleCourseStatus,
  resetStudentFace,
  resetAllFaces
} from '../../services/adminService';
import { formatDate } from '../../utils/helpers';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ full_name: '', email: '', password: '', role: 'student', student_number: '' });
  const [addingUser, setAddingUser] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [userSearch, setUserSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [s, u, c] = await Promise.all([getStats(), getAllUsers(), getAllCoursesAdmin()]);
      setStats(s);
      setUsers(u);
      setCourses(c);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const showConfirm = (title, message, onConfirm) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  const handleConfirm = async () => {
    setConfirmModal({ ...confirmModal, show: false });
    if (confirmModal.onConfirm) await confirmModal.onConfirm();
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddingUser(true);
    setError('');
    try {
      await api.post('/auth/register', addUserForm);
      setSuccess('User added successfully.');
      setShowAddUser(false);
      setAddUserForm({ full_name: '', email: '', password: '', role: 'student', student_number: '' });
      const u = await getAllUsers();
      setUsers(u);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add user.');
    } finally {
      setAddingUser(false);
    }
  };

  const handleToggleUser = async (uuid) => {
    try {
      const res = await toggleUserStatus(uuid);
      setSuccess(res.message);
      setUsers(users.map(u => u.uuid === uuid ? { ...u, is_active: !u.is_active } : u));
    } catch (err) {
      setError('Failed to update user.');
    }
  };

  const handleDeleteUser = (uuid) => {
    showConfirm(
      'Delete User',
      'Are you sure you want to delete this user? This action cannot be undone.',
      async () => {
        try {
          await deleteUser(uuid);
          setSuccess('User deleted successfully.');
          setUsers(users.filter(u => u.uuid !== uuid));
        } catch (err) {
          setError('Failed to delete user.');
        }
      }
    );
  };

  const handleToggleCourse = async (uuid) => {
    try {
      const res = await toggleCourseStatus(uuid);
      setSuccess(res.message);
      setCourses(courses.map(c => c.uuid === uuid ? { ...c, is_active: !c.is_active } : c));
    } catch (err) {
      setError('Failed to update course.');
    }
  };

  const handleResetFace = (uuid) => {
    showConfirm(
      'Reset Face Data',
      'Are you sure you want to reset face data for this student? They will need to register their face again.',
      async () => {
        try {
          await resetStudentFace(uuid);
          setSuccess('Face data reset successfully.');
        } catch (err) {
          setError('Failed to reset face data.');
        }
      }
    );
  };

  const handleResetAllFaces = () => {
    showConfirm(
      'Reset All Face Data',
      'Are you sure you want to reset ALL student face data? All students will need to register their faces again. This cannot be undone.',
      async () => {
        try {
          const res = await resetAllFaces();
          setSuccess(res.message);
        } catch (err) {
          setError('Failed to reset all faces.');
        }
      }
    );
  };

  const roleBadge = (role) => {
    const colors = { admin: 'danger', instructor: 'primary', student: 'success' };
    return <Badge bg={colors[role]}>{role}</Badge>;
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.student_number && u.student_number.includes(userSearch))
  );

  const filteredCourses = courses.filter(c =>
    c.course_code.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.course_name.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.instructor_name.toLowerCase().includes(courseSearch.toLowerCase())
  );

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container>
      <h4 className="mb-4">Admin Dashboard — {user?.full_name}</h4>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="mb-4">
        {[
          { label: 'Students', value: stats?.students, color: 'success' },
          { label: 'Instructors', value: stats?.instructors, color: 'primary' },
          { label: 'Courses', value: stats?.courses, color: 'info' },
          { label: 'Sessions', value: stats?.sessions, color: 'warning' },
          { label: 'Attendances', value: stats?.attendances, color: 'secondary' }
        ].map((s, i) => (
          <Col key={i} md={2} sm={4} xs={6} className="mb-3">
            <Card className={`text-center shadow-sm border-${s.color}`}>
              <Card.Body className="py-3">
                <h3 className={`text-${s.color}`}>{s.value}</h3>
                <p className="text-muted mb-0 small">{s.label}</p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <div className="d-flex flex-wrap gap-2 mb-4">
        <Button variant="success" onClick={() => setShowAddUser(true)}>+ Add User</Button>
        <Button variant="primary" onClick={() => navigate('/admin/timetable')}>Upload Timetable</Button>
        <Button variant="outline-secondary" onClick={() => navigate('/admin/settings')}>System Settings</Button>
        <Button variant="outline-danger" onClick={handleResetAllFaces}>Reset All Faces</Button>
      </div>

      <Tabs defaultActiveKey="users" className="mb-4">
        <Tab eventKey="users" title="Users">
          <Card className="shadow-sm">
            <Card.Body>
              <Form.Control
                className="mb-3"
                placeholder="Search by name, email or student number..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <Table responsive hover>
                <thead className="table-dark">
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Student No</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-muted">No users found.</td></tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.uuid}>
                        <td>{u.full_name}</td>
                        <td>{u.email}</td>
                        <td>{roleBadge(u.role)}</td>
                        <td>{u.student_number || '—'}</td>
                        <td>
                          <Badge bg={u.is_active ? 'success' : 'secondary'}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>{formatDate(u.created_at)}</td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            <Button
                              size="sm"
                              variant={u.is_active ? 'outline-warning' : 'outline-success'}
                              onClick={() => handleToggleUser(u.uuid)}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleDeleteUser(u.uuid)}
                            >
                              Delete
                            </Button>
                            {u.role === 'student' && (
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={() => handleResetFace(u.uuid)}
                              >
                                Reset Face
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="courses" title="Courses">
          <Card className="shadow-sm">
            <Card.Body>
              <Form.Control
                className="mb-3"
                placeholder="Search by course code, name or instructor..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
              />
              <Table responsive hover>
                <thead className="table-dark">
                  <tr>
                    <th>Code</th>
                    <th>Course Name</th>
                    <th>Instructor</th>
                    <th>Semester</th>
                    <th>Students</th>
                    <th>Threshold</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-muted">No courses found.</td></tr>
                  ) : (
                    filteredCourses.map((c) => (
                      <tr key={c.uuid}>
                        <td><strong>{c.course_code}</strong></td>
                        <td>{c.course_name}</td>
                        <td>{c.instructor_name}</td>
                        <td>{c.semester}</td>
                        <td>{c.student_count}</td>
                        <td>{c.attendance_threshold}%</td>
                        <td>
                          <Badge bg={c.is_active ? 'success' : 'secondary'}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant={c.is_active ? 'outline-warning' : 'outline-success'}
                            onClick={() => handleToggleCourse(c.uuid)}
                          >
                            {c.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Add User Modal */}
      <Modal show={showAddUser} onHide={() => setShowAddUser(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddUser}>
            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                value={addUserForm.full_name}
                onChange={(e) => setAddUserForm({ ...addUserForm, full_name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={addUserForm.email}
                onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={addUserForm.password}
                onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={addUserForm.role}
                onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value })}
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
            {addUserForm.role === 'student' && (
              <Form.Group className="mb-3">
                <Form.Label>Student Number</Form.Label>
                <Form.Control
                  value={addUserForm.student_number}
                  onChange={(e) => setAddUserForm({ ...addUserForm, student_number: e.target.value })}
                  required
                />
              </Form.Group>
            )}
            <Button type="submit" variant="success" className="w-100" disabled={addingUser}>
              {addingUser ? <Spinner size="sm" /> : 'Add User'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Confirm Modal */}
      <Modal show={confirmModal.show} onHide={() => setConfirmModal({ ...confirmModal, show: false })} centered>
        <Modal.Header closeButton>
          <Modal.Title>{confirmModal.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{confirmModal.message}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;