import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { createCourse } from '../../services/courseService';
import { PlusCircleFill, TrashFill } from 'react-bootstrap-icons';

const YEARS = () => {
  const current = new Date().getFullYear();
  return [`${current-1}-${current}`, `${current}-${current+1}`, `${current+1}-${current+2}`];
};

const TERMS = ['Spring', 'Summer', 'Fall'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CreateCourse = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    course_code: '',
    course_name: '',
    group_name: '',
    attendance_threshold: 70
  });
  const [year, setYear] = useState(`${new Date().getFullYear()-1}-${new Date().getFullYear()}`);
  const [term, setTerm] = useState('Spring');
  const [schedules, setSchedules] = useState([{ day: 'Monday', start_time: '', end_time: '' }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleScheduleChange = (index, field, value) => {
    const updated = [...schedules];
    updated[index][field] = value;
    setSchedules(updated);
  };

  const addSchedule = () => {
    setSchedules([...schedules, { day: 'Monday', start_time: '', end_time: '' }]);
  };

  const removeSchedule = (index) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');

  const validSchedules = schedules.filter(s => s.day && s.start_time && s.end_time);
  if (validSchedules.length === 0) {
    return setError('Please add at least one class schedule with day and time.');
  }

  setLoading(true);
  try {
    await createCourse({
      ...form,
      semester: `${year} ${term}`,
      schedules: validSchedules
    });
    navigate('/instructor');
  } catch (err) {
    setError(err.response?.data?.message || 'Failed to create course.');
  } finally {
    setLoading(false);
  }
};

  return (
    <Container>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => navigate('/instructor')}>
        ← Back
      </Button>
      <Card className="shadow-sm" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Card.Header><strong>Create New Course</strong></Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Course Code</Form.Label>
              <Form.Control
                name="course_code"
                value={form.course_code}
                onChange={handleChange}
                placeholder="e.g. CS101"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Course Name</Form.Label>
              <Form.Control
                name="course_name"
                value={form.course_name}
                onChange={handleChange}
                placeholder="e.g. Introduction to Computer Science"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Semester</Form.Label>
              <Row className="g-2">
                <Col>
                  <Form.Select value={year} onChange={(e) => setYear(e.target.value)}>
                    {YEARS().map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col>
                  <Form.Select value={term} onChange={(e) => setTerm(e.target.value)}>
                    {TERMS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>
              <Form.Text className="text-muted">Selected: {year} {term}</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
  <Form.Label>Group <span className="text-muted small">(optional)</span></Form.Label>
  <Form.Control
    name="group_name"
    value={form.group_name || ''}
    onChange={handleChange}
    placeholder="e.g. 1, 2, A, B"
    maxLength={50}
  />
  <Form.Text className="text-muted">
    Leave empty if this course has no groups.
  </Form.Text>
</Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Attendance Threshold (%)</Form.Label>
              <Form.Control
                type="number"
                name="attendance_threshold"
                min="0"
                max="100"
                value={form.attendance_threshold}
                onChange={handleChange}
              />
              <Form.Text className="text-muted">
                Students below this percentage will be flagged as at risk.
              </Form.Text>
            </Form.Group>

            {/* Schedule */}
            <Form.Group className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="mb-0">Class Schedule</Form.Label>

                <Button variant="outline-primary" size="sm" onClick={addSchedule} className="d-flex align-items-center gap-1">
                  <PlusCircleFill size={14} /> Add Day
                </Button>
              </div>
              {schedules.map((s, i) => (
                <Row key={i} className="g-2 mb-2 align-items-center">
                  <Col md={4}>
                    <Form.Select value={s.day} onChange={(e) => handleScheduleChange(i, 'day', e.target.value)}>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Form.Control
                      type="time"
                      value={s.start_time}
                      onChange={(e) => handleScheduleChange(i, 'start_time', e.target.value)}
                      placeholder="Start"
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Control
                      type="time"
                      value={s.end_time}
                      onChange={(e) => handleScheduleChange(i, 'end_time', e.target.value)}
                      placeholder="End"
                    />
                  </Col>
                  <Col md={2}>
                    {schedules.length > 1 && (
                      <Button variant="outline-danger" size="sm" onClick={() => removeSchedule(i)}>
                        <TrashFill size={14} />
                      </Button>
                    )}
                  </Col>
                </Row>
              ))}
            </Form.Group>

            <Button type="submit" variant="primary" className="w-100" disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Create Course'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default CreateCourse;