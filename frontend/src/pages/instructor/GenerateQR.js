import React, { useState } from 'react';
import { Container, Card, Button, Form, Alert, Spinner, Image, Badge } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { generateQR } from '../../services/sessionService';

const GenerateQR = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [duration, setDuration] = useState(15);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await generateQR(uuid, duration);
      setQrData(data);

      let seconds = duration * 60;
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate QR code.');
    } finally {
      setLoading(false);
    }
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
<Card className="shadow-sm mx-auto" style={{ maxWidth: '500px' }}>        <Card.Header><strong>Generate QR Code</strong></Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          {!qrData ? (
            <Form onSubmit={handleGenerate}>
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
                onClick={() => { setQrData(null); setTimeLeft(null); }}
              >
                Cancel Session
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default GenerateQR;