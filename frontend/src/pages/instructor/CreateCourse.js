import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      return setError(t('instructor.createCourse.scheduleRequired'));
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
      setError(err.response?.data?.message || t('instructor.createCourse.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => navigate('/instructor')}>
        ← {t('common.back')}
      </Button>
      <Card className="shadow-sm" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Card.Header><strong>{t('instructor.createCourse.title')}</strong></Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>{t('instructor.manageCourse.courseCode')}</Form.Label>
              <Form.Control name="course_code" value={form.course_code} onChange={handleChange} placeholder="e.g. CS101" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('instructor.manageCourse.courseName')}</Form.Label>
              <Form.Control name="course_name" value={form.course_name} onChange={handleChange} placeholder="e.g. Introduction to Computer Science" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('instructor.manageCourse.semester')}</Form.Label>
              <Row className="g-2">
                <Col>
                  <Form.Select value={year} onChange={(e) => setYear(e.target.value)}>
                    {YEARS().map(y => <option key={y} value={y}>{y}</option>)}
                  </Form.Select>
                </Col>
                <Col>
                  <Form.Select value={term} onChange={(e) => setTerm(e.target.value)}>
                    {TERMS.map(term => <option key={term} value={term}>{t(`terms.${term}`)}</option>)}
                  </Form.Select>
                </Col>
              </Row>
              <Form.Text className="text-muted">{t('instructor.createCourse.selected')} {year} {t(`terms.${term}`)}</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>
                {t('instructor.createCourse.group')} <span className="text-muted small">{t('instructor.createCourse.groupOptional')}</span>
              </Form.Label>
              <Form.Control name="group_name" value={form.group_name || ''} onChange={handleChange} placeholder="e.g. 1, 2, A, B" maxLength={50} />
              <Form.Text className="text-muted">{t('instructor.createCourse.groupHelp')}</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('instructor.manageCourse.threshold')}</Form.Label>
              <Form.Control type="number" name="attendance_threshold" min="0" max="100" value={form.attendance_threshold} onChange={handleChange} />
              <Form.Text className="text-muted">{t('instructor.createCourse.thresholdHelp')}</Form.Text>
            </Form.Group>

            <Form.Group className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="mb-0">{t('instructor.manageCourse.schedule')}</Form.Label>
                <Button variant="outline-danger" size="sm" onClick={addSchedule} className="d-flex align-items-center gap-1">
                  <PlusCircleFill size={14} /> {t('instructor.manageCourse.addDay')}
                </Button>
              </div>
              {schedules.map((s, i) => (
                <Row key={i} className="g-2 mb-2 align-items-center">
                  <Col md={4}>
                    <Form.Select value={s.day} onChange={(e) => handleScheduleChange(i, 'day', e.target.value)}>
                      {DAYS.map(d => <option key={d} value={d}>{t(`days.${d}`)}</option>)}
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Form.Control type="time" value={s.start_time} onChange={(e) => handleScheduleChange(i, 'start_time', e.target.value)} />
                  </Col>
                  <Col md={3}>
                    <Form.Control type="time" value={s.end_time} onChange={(e) => handleScheduleChange(i, 'end_time', e.target.value)} />
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

            <Button type="submit" variant="danger" className="w-100" disabled={loading}>
              {loading ? <Spinner size="sm" /> : t('instructor.createCourse.createBtn')}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default CreateCourse;