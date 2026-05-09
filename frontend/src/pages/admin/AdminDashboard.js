import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Spinner, Alert, Tabs, Tab, Modal, Form } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import {
  getStats, getAllUsers, toggleUserStatus, deleteUser,
  getAllCoursesAdmin, toggleCourseStatus, resetStudentFace, resetAllFaces
} from '../../services/adminService';
import { formatDate } from '../../utils/helpers';
import { Download } from 'react-bootstrap-icons';

const USERS_PER_PAGE = 10;
const COURSES_PER_PAGE = 10;

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
  const [userPage, setUserPage] = useState(1);
  const [coursePage, setCoursePage] = useState(1);

  // Import modals
  const [showImportStudents, setShowImportStudents] = useState(false);
  const [showImportInstructors, setShowImportInstructors] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const studentImportRef = useRef(null);
  const instructorImportRef = useRef(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [s, u, c] = await Promise.all([getStats(), getAllUsers(), getAllCoursesAdmin()]);
      setStats(s); setUsers(u); setCourses(c);
    } catch { setError('Failed to load dashboard data.'); }
    finally { setLoading(false); }
  };

  const showConfirm = (title, message, onConfirm) => setConfirmModal({ show: true, title, message, onConfirm });

  const handleConfirm = async () => {
    setConfirmModal({ ...confirmModal, show: false });
    if (confirmModal.onConfirm) await confirmModal.onConfirm();
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddingUser(true); setError('');
    try {
      await api.post('/auth/register', addUserForm);
      setSuccess('User added successfully.');
      setShowAddUser(false);
      setAddUserForm({ full_name: '', email: '', password: '', role: 'student', student_number: '' });
      const u = await getAllUsers(); setUsers(u);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add user.');
    } finally { setAddingUser(false); }
  };

  const handleToggleUser = async (uuid) => {
    try {
      const res = await toggleUserStatus(uuid);
      setSuccess(res.message);
      setUsers(users.map(u => u.uuid === uuid ? { ...u, is_active: !u.is_active } : u));
    } catch { setError('Failed to update user.'); }
  };

  const handleDeleteUser = (uuid) => {
    showConfirm('Delete User', 'Are you sure you want to delete this user? This action cannot be undone.', async () => {
      try {
        await deleteUser(uuid);
        setSuccess('User deleted successfully.');
        setUsers(users.filter(u => u.uuid !== uuid));
      } catch { setError('Failed to delete user.'); }
    });
  };

  const handleToggleCourse = async (uuid) => {
    try {
      const res = await toggleCourseStatus(uuid);
      setSuccess(res.message);
      setCourses(courses.map(c => c.uuid === uuid ? { ...c, is_active: !c.is_active } : c));
    } catch { setError('Failed to update course.'); }
  };

  const handleResetFace = (uuid) => {
    showConfirm('Reset Face Data', 'Are you sure you want to reset face data for this student?', async () => {
      try { await resetStudentFace(uuid); setSuccess('Face data reset successfully.'); }
      catch { setError('Failed to reset face data.'); }
    });
  };

  const handleResetAllFaces = () => {
    showConfirm('Reset All Face Data', 'Are you sure you want to reset ALL student face data? This cannot be undone.', async () => {
      try { const res = await resetAllFaces(); setSuccess(res.message); }
      catch { setError('Failed to reset all faces.'); }
    });
  };

  // ─── Excel Templates ───
  const downloadStudentTemplate = () => {
    const data = [
      { full_name: 'Eren Altın', email: 'eren@final.edu.tr', password: 'Pass123', student_number: '2003060001' },
      { full_name: 'Test Student', email: 'test@final.edu.tr', password: 'Pass123', student_number: '2003060002' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'student_import_template.xlsx');
  };

  const downloadInstructorTemplate = () => {
    const data = [
      { full_name: 'Dr. İbrahim Adeshola', email: 'ibrahim@final.edu.tr', password: 'Pass123' },
      { full_name: 'Dr. imane Boumedra', email: 'imane@final.edu.tr', password: 'Pass123' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Instructors');
    XLSX.writeFile(wb, 'instructor_import_template.xlsx');
  };

  // ─── Excel Import ───
  const handleImport = async (role) => {
    const ref = role === 'student' ? studentImportRef : instructorImportRef;
    const file = ref.current?.files[0];
    if (!file) return setError('Please select a file.');

    setImportLoading(true);
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) {
        setError('Excel file is empty.');
        setImportLoading(false);
        return;
      }

      const response = await api.post('/auth/bulk-register', { users: rows, role });
      const result = response.data.data;
      setImportResult(result);

      if (result.success_count > 0) {
        const u = await getAllUsers();
        setUsers(u);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to import users.');
    } finally {
      setImportLoading(false);
    }
  };

  const closeImportModal = (role) => {
    setImportResult(null);
    if (role === 'student') setShowImportStudents(false);
    else setShowImportInstructors(false);
  };

  const roleBadge = (role) => {
    const colors = { admin: 'danger', instructor: 'primary', student: 'secondary' };
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

  const userTotalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE);
  const courseTotalPages = Math.ceil(filteredCourses.length / COURSES_PER_PAGE);
  const paginatedCourses = filteredCourses.slice((coursePage - 1) * COURSES_PER_PAGE, coursePage * COURSES_PER_PAGE);

  const PaginationBar = ({ currentPage, totalPages, totalItems, perPage, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="d-flex justify-content-between align-items-center mt-3 px-3 pb-3">
        <small className="text-muted">
          Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, totalItems)} of {totalItems}
        </small>
        <div className="d-flex gap-1 flex-wrap">
          <Button size="sm" variant="outline-secondary" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>&larr;</Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button key={page} size="sm" variant={currentPage === page ? 'danger' : 'outline-secondary'} onClick={() => onPageChange(page)}>{page}</Button>
          ))}
          <Button size="sm" variant="outline-secondary" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>&rarr;</Button>
        </div>
      </div>
    );
  };

  // ─── Import Modal ───
  const ImportModal = ({ show, onClose, role, fileRef, onImport }) => (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Import {role === 'student' ? 'Students' : 'Instructors'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="info" className="small">
          Excel file must contain: <strong>full_name</strong>, <strong>email</strong>, <strong>password</strong>
          {role === 'student' && <>, <strong>student_number</strong></>} columns.
        </Alert>
        <Button variant="outline-secondary" size="sm" className="mb-3 d-flex align-items-center gap-1"
          onClick={role === 'student' ? downloadStudentTemplate : downloadInstructorTemplate}>
          <Download size={14} /> Download Template
        </Button>
        <Form.Group>
          <Form.Label>Select Excel File (.xlsx)</Form.Label>
          <Form.Control type="file" accept=".xlsx,.xls" ref={fileRef} />
        </Form.Group>

        {importResult && (
          <div className="mt-3">
            <Alert variant={importResult.failed_count > 0 ? 'warning' : 'success'} className="small mb-2">
              ✓ <strong>{importResult.success_count}</strong> imported successfully.
              {importResult.failed_count > 0 && <> ✗ <strong>{importResult.failed_count}</strong> failed.</>}
            </Alert>
            {importResult.failed?.length > 0 && (
              <div style={{ maxHeight: '160px', overflowY: 'auto', fontSize: '12px' }}>
                {importResult.failed.map((f, i) => (
                  <div key={i} className="text-danger">✗ {f.email} — {f.reason}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button variant="danger" onClick={() => onImport(role)} disabled={importLoading}>
          {importLoading ? <><Spinner size="sm" className="me-1" />Importing...</> : 'Import'}
        </Button>
      </Modal.Footer>
    </Modal>
  );

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container>
      <h4 className="mb-4">Admin Dashboard — {user?.full_name}</h4>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="mb-4">
        {[
          { label: 'Students', value: stats?.students },
          { label: 'Instructors', value: stats?.instructors },
          { label: 'Courses', value: stats?.courses },
          { label: 'Sessions', value: stats?.sessions },
          { label: 'Attendances', value: stats?.attendances }
        ].map((s, i) => (
          <Col key={i} md={2} sm={4} xs={6} className="mb-3">
            <Card className="text-center shadow-sm border-primary">
              <Card.Body className="py-3">
                <h3 className="text-primary">{s.value}</h3>
                <p className="text-muted mb-0 small">{s.label}</p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <div className="d-flex flex-wrap gap-2 mb-4">
        <Button variant="danger" onClick={() => setShowAddUser(true)}>+ Add User</Button>
        <Button variant="danger" onClick={() => setShowImportStudents(true)}>Import Students</Button>
        <Button variant="danger" onClick={() => setShowImportInstructors(true)}>Import Instructors</Button>
        <Button variant="danger" onClick={() => navigate('/admin/timetable')}>Upload Timetable</Button>
        <Button variant="danger" onClick={() => navigate('/admin/settings')}>System Settings</Button>
        <Button variant="secondary" onClick={handleResetAllFaces}>Reset All Faces</Button>
      </div>

      <Tabs defaultActiveKey="users" className="mb-4">

        {/* ─── Users Tab ─── */}
        <Tab eventKey="users" title="Users">
          <Card className="shadow-sm" style={{ borderRadius: '14px', overflow: 'hidden' }}>
            <Card.Body className="pb-2">
              <Form.Control
                className="mb-3"
                placeholder="Search by name, email or student number..."
                value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
              />
              {/* Desktop Table */}
              <div className="d-none d-md-block">
                <Table hover className="mb-0">
                  <thead className="table-dark">
                    <tr><th>Name</th><th>Email</th><th>Role</th><th>Student No</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.length === 0 ? (
                      <tr><td colSpan={7} className="text-center text-muted py-3">No users found.</td></tr>
                    ) : paginatedUsers.map(u => (
                      <tr key={u.uuid}>
                        <td>{u.full_name}</td>
                        <td>{u.email}</td>
                        <td>{roleBadge(u.role)}</td>
                        <td>{u.student_number || '—'}</td>
                        <td><Badge bg={u.is_active ? 'success' : 'secondary'}>{u.is_active ? 'Active' : 'Inactive'}</Badge></td>
                        <td>{formatDate(u.created_at)}</td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            <Button size="sm" variant={u.is_active ? 'danger' : 'success'} onClick={() => handleToggleUser(u.uuid)}>
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleDeleteUser(u.uuid)}>Delete</Button>
                            {u.role === 'student' && (
                              <Button size="sm" variant="secondary" onClick={() => handleResetFace(u.uuid)}>Reset Face</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {/* Mobile Card List */}
              <div className="d-md-none">
                {paginatedUsers.length === 0 ? (
                  <p className="text-center text-muted py-3">No users found.</p>
                ) : paginatedUsers.map(u => (
                  <Card key={u.uuid} className="shadow-sm border-0 mb-3" style={{ borderRadius: '10px' }}>
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <strong>{u.full_name}</strong>
                          <div className="text-muted small">{u.email}</div>
                        </div>
                        <div className="d-flex gap-1 flex-wrap">
                          {roleBadge(u.role)}
                          <Badge bg={u.is_active ? 'success' : 'secondary'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
                        </div>
                      </div>
                      <hr className="my-2" />
                      <div style={{ fontSize: '0.82rem' }} className="mb-2">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted">Student No</span>
                          <span>{u.student_number || '—'}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Joined</span>
                          <span>{formatDate(u.created_at)}</span>
                        </div>
                      </div>
                      <div className="d-flex flex-wrap gap-1">
                        <Button size="sm" variant={u.is_active ? 'danger' : 'success'} onClick={() => handleToggleUser(u.uuid)}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDeleteUser(u.uuid)}>Delete</Button>
                        {u.role === 'student' && (
                          <Button size="sm" variant="secondary" onClick={() => handleResetFace(u.uuid)}>Reset Face</Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </Card.Body>
            <PaginationBar currentPage={userPage} totalPages={userTotalPages} totalItems={filteredUsers.length} perPage={USERS_PER_PAGE} onPageChange={setUserPage} />
          </Card>
        </Tab>

        {/* ─── Courses Tab ─── */}
        <Tab eventKey="courses" title="Courses">
          <Card className="shadow-sm" style={{ borderRadius: '14px', overflow: 'hidden' }}>
            <Card.Body className="pb-2">
              <Form.Control
                className="mb-3"
                placeholder="Search by course code, name or instructor..."
                value={courseSearch}
                onChange={e => { setCourseSearch(e.target.value); setCoursePage(1); }}
              />
              {/* Desktop Table */}
              <div className="d-none d-md-block">
                <Table hover className="mb-0">
                  <thead className="table-dark">
                    <tr><th>Code</th><th>Course Name</th><th>Instructor</th><th>Semester</th><th>Students</th><th>Threshold</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {paginatedCourses.length === 0 ? (
                      <tr><td colSpan={8} className="text-center text-muted py-3">No courses found.</td></tr>
                    ) : paginatedCourses.map(c => (
                      <tr key={c.uuid}>
                        <td><strong>{c.course_code}</strong></td>
                        <td>{c.course_name}</td>
                        <td>{c.instructor_name}</td>
                        <td>{c.semester}</td>
                        <td>{c.student_count}</td>
                        <td>{c.attendance_threshold}%</td>
                        <td><Badge bg={c.is_active ? 'success' : 'secondary'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></td>
                        <td>
                          <Button size="sm" variant={c.is_active ? 'danger' : 'success'} onClick={() => handleToggleCourse(c.uuid)}>
                            {c.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {/* Mobile Card List */}
              <div className="d-md-none">
                {paginatedCourses.length === 0 ? (
                  <p className="text-center text-muted py-3">No courses found.</p>
                ) : paginatedCourses.map(c => (
                  <Card key={c.uuid} className="shadow-sm border-0 mb-3" style={{ borderRadius: '10px' }}>
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <strong>{c.course_code}</strong>
                          <div className="text-muted small">{c.course_name}</div>
                        </div>
                        <Badge bg={c.is_active ? 'success' : 'secondary'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                      </div>
                      <hr className="my-2" />
                      <div style={{ fontSize: '0.82rem' }} className="mb-2">
                        <div className="d-flex justify-content-between mb-1"><span className="text-muted">Instructor</span><span>{c.instructor_name}</span></div>
                        <div className="d-flex justify-content-between mb-1"><span className="text-muted">Semester</span><span>{c.semester}</span></div>
                        <div className="d-flex justify-content-between mb-1"><span className="text-muted">Students</span><span>{c.student_count}</span></div>
                        <div className="d-flex justify-content-between"><span className="text-muted">Threshold</span><span>{c.attendance_threshold}%</span></div>
                      </div>
                      <Button size="sm" variant={c.is_active ? 'danger' : 'success'} className="w-100" onClick={() => handleToggleCourse(c.uuid)}>
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </Card.Body>
            <PaginationBar currentPage={coursePage} totalPages={courseTotalPages} totalItems={filteredCourses.length} perPage={COURSES_PER_PAGE} onPageChange={setCoursePage} />
          </Card>
        </Tab>
      </Tabs>

      {/* Add User Modal */}
      <Modal show={showAddUser} onHide={() => setShowAddUser(false)}>
        <Modal.Header closeButton><Modal.Title>Add New User</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddUser}>
            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control value={addUserForm.full_name} onChange={e => setAddUserForm({ ...addUserForm, full_name: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={addUserForm.email} onChange={e => setAddUserForm({ ...addUserForm, email: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control type="password" value={addUserForm.password} onChange={e => setAddUserForm({ ...addUserForm, password: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select value={addUserForm.role} onChange={e => setAddUserForm({ ...addUserForm, role: e.target.value })}>
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
            {addUserForm.role === 'student' && (
              <Form.Group className="mb-3">
                <Form.Label>Student Number</Form.Label>
                <Form.Control value={addUserForm.student_number} onChange={e => setAddUserForm({ ...addUserForm, student_number: e.target.value })} required />
              </Form.Group>
            )}
            <Button type="submit" variant="danger" className="w-100" disabled={addingUser}>
              {addingUser ? <Spinner size="sm" /> : 'Add User'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Import Students Modal */}
      <ImportModal
        show={showImportStudents}
        onClose={() => closeImportModal('student')}
        role="student"
        fileRef={studentImportRef}
        onImport={handleImport}
      />

      {/* Import Instructors Modal */}
      <ImportModal
        show={showImportInstructors}
        onClose={() => closeImportModal('instructor')}
        role="instructor"
        fileRef={instructorImportRef}
        onImport={handleImport}
      />

      {/* Confirm Modal */}
      <Modal show={confirmModal.show} onHide={() => setConfirmModal({ ...confirmModal, show: false })} centered>
        <Modal.Header closeButton><Modal.Title>{confirmModal.title}</Modal.Title></Modal.Header>
        <Modal.Body><p>{confirmModal.message}</p></Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirm}>Confirm</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;