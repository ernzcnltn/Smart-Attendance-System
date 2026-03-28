import React, { useState } from 'react';
import { Container, Card, Button, Form, Alert, Spinner, Image, Modal, Badge } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const GenerateQR = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [duration, setDuration] = useState(15);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [timerInterval, setTimerInterval] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [existingSession, setExistingSession] = useState(null);

  const generateQR = async (useExisting = false, forceNew = false) => {
    setError('');
    setLoading(true);
    setShowModal(false);
    try {
      const response = await api.post(`/sessions/course/${uuid}/qr`, {
        duration_minutes: duration,
        use_existing: useExisting,
        force_new: forceNew
      });

      if (response.data.has_existing) {
        setExistingSession(response.data.data.existing_session);
        setShowModal(true);
        setLoading(false);
        return;
      }

      const data = response.data.data;
      setQrData(data);

      let seconds = parseInt(duration) * 60;
      setTimeLeft(seconds);
      const interval = setInterval(() => {
        seconds -= 1;
        setTimeLeft(seconds);
        if (seconds <= 0) {
          clearInterval(interval);
          setQrData(null);
          setTimeLeft(null);
        }
      }, 1000);
      setTimerInterval(interval);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate QR code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSession = async () => {
    if (timerInterval) clearInterval(timerInterval);
    try {
      await api.delete(`/sessions/${qrData.session_uuid}`);
    } catch (err) {}
    setQrData(null);
    setTimeLeft(null);
    setTimerInterval(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    generateQR(false, false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <Container>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => navigate('/instructor')}>
        ← Back
      </Button>
      <Card className="shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Header><strong>Generate QR Code</strong></Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          {!qrData ? (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>QR Duration (minutes)</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  max="60"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
                <Form.Text className="text-muted">
                  QR code will expire after this duration.
                </Form.Text>
              </Form.Group>
              <Button type="submit" variant="primary" className="w-100" disabled={loading}>
                {loading ? <Spinner size="sm" /> : 'Start Session & Generate QR'}
              </Button>
            </Form>
          ) : (
            <div className="text-center">
              <div className="mb-3">
                <Badge bg={timeLeft > 60 ? 'success' : 'danger'} className="fs-5 px-3 py-2">
                  {formatTime(timeLeft)}
                </Badge>
                <p className="text-muted mt-1 small">Time remaining</p>
              </div>
              <Image src={qrData.qr_code} fluid className="border rounded p-2" style={{ maxWidth: '300px' }} />
              <p className="text-muted mt-3 small">
                Show this QR code to students. It will expire automatically.
              </p>
              <Button
                variant="outline-danger"
                size="sm"
                className="mt-2"
                onClick={handleCancelSession}
              >
                Cancel Session
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Active Session Exists</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>An active session already exists for today:</p>
          <div className="bg-light rounded p-3 mb-3">
            <p className="mb-1"><strong>Date:</strong> {existingSession?.session_date}</p>
            <p className="mb-0"><strong>Time:</strong> {existingSession?.start_time} - {existingSession?.end_time}</p>
          </div>
          <p className="text-muted small">
            Would you like to generate a new QR for the existing session, or create a new session?
            <br />
            <strong>Note:</strong> If you have multiple groups at different times, create a new session.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => generateQR(false, true)}
          >
            Create New Session
          </Button>
          <Button
            variant="primary"
            onClick={() => generateQR(true, false)}
          >
            Use Existing Session
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default GenerateQR;