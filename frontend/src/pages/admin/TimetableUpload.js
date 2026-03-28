import React, { useState } from 'react';
import { Container, Card, Button, Alert, Spinner, Table, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const TimetableUpload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.name.endsWith('.csv')) {
      setFile(selected);
      setError('');
    } else {
      setError('Please select a valid CSV file.');
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
    const csv = [
      'course_code,course_name,instructor_email,semester,attendance_threshold,session_date,start_time,end_time',
      'CS101,Introduction to Computer Science,instructor@test.com,2024-2025 Spring,70,2025-03-24,09:00:00,10:30:00',
      'CS102,Data Structures,instructor@test.com,2024-2025 Spring,70,2025-03-25,11:00:00,12:30:00'
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timetable_template.csv';
    a.click();
    URL.revokeObjectURL(url);
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

          <p className="text-muted small mb-3">
            Upload a CSV file to create courses and sessions in bulk.
            Download the template to see the required format.
          </p>

          <Button variant="outline-secondary" size="sm" className="mb-3" onClick={downloadTemplate}>
            Download CSV Template
          </Button>

          <div className="mb-3">
            <input
              type="file"
              accept=".csv"
              className="form-control"
              onChange={handleFileChange}
            />
          </div>

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
            <div className="d-flex gap-3 mb-3">
              <Badge bg="secondary" className="fs-6">Processed: {result.processed}</Badge>
              <Badge bg="success" className="fs-6">Created: {result.created}</Badge>
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