import React, { useEffect, useState } from 'react';
import { Container, Card, Table, Badge, Spinner, Alert, Form, Row, Col, Button } from 'react-bootstrap';
import { getMyAttendance } from '../../services/sessionService';
import { formatDate } from '../../utils/helpers';

const MyAttendance = () => {
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getMyAttendance();
        setRecords(data);
        setFiltered(data);
      } catch (err) {
        setError('Failed to load attendance records.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const courses = [...new Set(records.map(r => r.course_code))];

  const handleFilter = () => {
    let result = records;

    if (courseFilter) {
      result = result.filter(r => r.course_code === courseFilter);
    }

    if (startDate) {
      result = result.filter(r => new Date(r.session_date) >= new Date(startDate));
    }

    if (endDate) {
      result = result.filter(r => new Date(r.session_date) <= new Date(endDate));
    }

    setFiltered(result);
  };

  const handleReset = () => {
    setCourseFilter('');
    setStartDate('');
    setEndDate('');
    setFiltered(records);
  };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container>
      <h4 className="mb-4">My Attendance</h4>
      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Label>Course</Form.Label>
              <Form.Select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Col>
            <Col md={2}>
              <div className="d-flex gap-2">
                <Button variant="primary" onClick={handleFilter} className="w-50">Filter</Button>
                <Button variant="outline-secondary" onClick={handleReset} className="w-50">Reset</Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          {filtered.length === 0 ? (
            <p className="text-muted">No attendance records found.</p>
          ) : (
            <Table responsive hover>
              <thead className="table-dark">
                <tr>
                  <th>Course</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Method</th>
                  <th>Marked At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.course_code}</strong><br /><small>{r.course_name}</small></td>
                    <td>{formatDate(r.session_date)}</td>
                    <td>{r.start_time} - {r.end_time}</td>
                    <td><Badge bg="info" text="dark">{r.method}</Badge></td>
                    <td>{formatDate(r.marked_at)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default MyAttendance;