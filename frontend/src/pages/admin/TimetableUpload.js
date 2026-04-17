import React, { useState } from 'react';
import { Container, Card, Button, Alert, Spinner, Table, Badge, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Download } from 'react-bootstrap-icons';
import * as XLSX from 'xlsx';
import api from '../../services/api';

const TimetableUpload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && (selected.name.endsWith('.xlsx') || selected.name.endsWith('.xls'))) {
      setFile(selected);
      setError('');
    } else {
      setError('Please select a valid Excel file (.xlsx).');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return setError('Please select a file first.');
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/timetable/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload timetable.');
    } finally {
      setLoading(false);
    }
  };

const downloadTemplate = () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['course_code', 'course_name', 'instructor_email', 'semester', 'attendance_threshold', 'group_name', 'day', 'start_time', 'end_time'],
    ['CS101', 'Introduction to Computer Science', 'instructor@final.edu.tr', '2025-2026 Spring', '70', '1', 'Monday', '09:00', '10:30'],
    ['CS101', 'Introduction to Computer Science', 'instructor@final.edu.tr', '2025-2026 Spring', '70', '1', 'Wednesday', '09:00', '10:30'],
    ['CS101', 'Introduction to Computer Science', 'instructor@final.edu.tr', '2025-2026 Spring', '70', '2', 'Monday', '12:30', '14:30'],
    ['CS102', 'Data Structures', 'instructor@final.edu.tr', '2025-2026 Spring', '70', '', 'Tuesday', '11:00', '12:30'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
  XLSX.writeFile(wb, 'timetable_template.xlsx');
};

  return (
    <Container>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => navigate('/admin')}>
        ← Back
      </Button>

      <Card className="shadow-sm mb-4" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Card.Header><strong>Upload Timetable</strong></Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Alert variant="info" className="small">
            Upload an Excel file to create courses and schedules for all instructors.
            <br />Required columns: <strong>course_code</strong>, <strong>course_name</strong>, <strong>instructor_email</strong>, <strong>semester</strong>, <strong>attendance_threshold</strong>, <strong>day</strong>, <strong>start_time</strong>, <strong>end_time</strong>
            <br />Day values: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
            <br />Time format: HH:MM (e.g. 09:00)
            <br />For multiple days, add a new row with the same course_code.
          </Alert>

          <Button
            variant="outline-secondary"
            size="sm"
            className="mb-3 d-flex align-items-center gap-1"
            onClick={downloadTemplate}
          >
            <Download size={14} /> Download Excel Template
          </Button>

          <Form.Group className="mb-3">
            <Form.Label>Select Excel File (.xlsx)</Form.Label>
            <Form.Control
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
          </Form.Group>

          <Button
            variant="primary"
            className="w-100"
            onClick={handleUpload}
            disabled={!file || loading}
          >
            {loading ? <Spinner size="sm" /> : 'Upload Timetable'}
          </Button>
        </Card.Body>
      </Card>

      {result && (
        <Card className="shadow-sm" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Card.Header><strong>Upload Result</strong></Card.Header>
          <Card.Body>
            <div className="d-flex gap-3 mb-3 flex-wrap">
              <Badge bg="secondary" className="fs-6">Processed: {result.processed}</Badge>
              <Badge bg="success" className="fs-6">Schedules: {result.created}</Badge>
              <Badge bg="primary" className="fs-6">New Courses: {result.coursesCreated}</Badge>
              <Badge bg="danger" className="fs-6">Errors: {result.errors?.length || 0}</Badge>
            </div>

            {result.errors?.length > 0 && (
              <>
                <p className="text-danger small mb-2"><strong>Errors:</strong></p>
                <Table size="sm" bordered>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="text-danger small">{e}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}

            {result.errors?.length === 0 && (
              <Alert variant="success">All rows processed successfully!</Alert>
            )}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default TimetableUpload;