import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Form, Alert, Spinner, Image, Modal, Badge } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/errorCodes';

const GenerateQR = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [duration, setDuration] = useState(15);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [timerInterval, setTimerInterval] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [existingSession, setExistingSession] = useState(null);

  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    if (!isOnline) getLocation();
  }, [isOnline]);

  const getLocation = () => {
    setGettingLocation(true);
    setLocationError('');
    setLocation(null);
    if (!navigator.geolocation) {
      setLocationError(t('instructor.generateQR.locationDenied'));
      setGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGettingLocation(false);
      },
      () => {
        setLocationError(t('instructor.generateQR.locationDenied'));
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const generateQR = async (useExisting = false, forceNew = false) => {
    if (!isOnline && !location) {
      setError('Location is required to start a session.');
      return;
    }
    setError('');
    setLoading(true);
    setShowModal(false);
    try {
      const response = await api.post(`/sessions/course/${uuid}/qr`, {
        duration_minutes: duration,
        use_existing: useExisting,
        force_new: forceNew,
        is_online: isOnline,
        latitude: isOnline ? null : location?.latitude,
        longitude: isOnline ? null : location?.longitude
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
      setError(getErrorMessage(err, t));
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
        ← {t('common.back')}
      </Button>
      <Card className="shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Header><strong>{t('instructor.generateQR.title')}</strong></Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          {/* Online Session Toggle */}
          <Form.Group className="mb-3">
            <Form.Check
              type="switch"
              id="online-switch"
              label={t('instructor.generateQR.onlineSession')}
              checked={isOnline}
              onChange={e => setIsOnline(e.target.checked)}
            />
            <Form.Text className="text-muted">
              {t('instructor.generateQR.onlineHelp')}
            </Form.Text>
          </Form.Group>

          {/* Konum durumu — sadece offline session'da göster */}
          {!isOnline && (
            <>
              {gettingLocation && (
                <Alert variant="info" className="small">
                  <Spinner size="sm" className="me-2" />
                  {t('instructor.generateQR.gettingLocation')}
                </Alert>
              )}
              {locationError && (
                <Alert variant="danger" className="small">
                  {locationError}
                  <div><Button variant="link" size="sm" className="p-0 mt-1" onClick={getLocation}>{t('instructor.generateQR.tryAgain')}</Button></div>
                </Alert>
              )}
              {location && !locationError && (
                <Alert variant="success" className="small">
                  ✓ {t('instructor.generateQR.locationCaptured')}
                </Alert>
              )}
            </>
          )}

          {isOnline && (
            <Alert variant="info" className="small">
              {t('instructor.generateQR.onlineMode')}
            </Alert>
          )}

          {!qrData ? (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>{t('instructor.generateQR.duration')}</Form.Label>
                <Form.Control
                  type="number" min="1" max="60"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
                <Form.Text className="text-muted">{t('instructor.generateQR.durationHelp')}</Form.Text>
              </Form.Group>
              <Button
                type="submit"
                variant="danger"
                className="w-100"
                disabled={loading || (!isOnline && (gettingLocation || !location))}
              >
                {loading ? <Spinner size="sm" /> : (!isOnline && !location) ? t('instructor.generateQR.waitingLocation') : t('instructor.generateQR.startSession')}
              </Button>
            </Form>
          ) : (
            <div className="text-center">
              <div className="mb-3">
                <Badge bg={timeLeft > 60 ? 'success' : 'danger'} className="fs-5 px-3 py-2">
                  {formatTime(timeLeft)}
                </Badge>
                <p className="text-muted mt-1 small">{t('instructor.generateQR.timeRemaining')}</p>
              </div>
              <Image src={qrData.qr_code} fluid className="border rounded p-2" style={{ maxWidth: '300px' }} />
              <p className="text-muted mt-3 small">{t('instructor.generateQR.showQR')}</p>
              <Button variant="outline-danger" size="sm" className="mt-2" onClick={handleCancelSession}>
                {t('instructor.generateQR.cancelSession')}
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('instructor.generateQR.activeSessionExists')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t('instructor.generateQR.activeSessionMsg')}</p>
          <div className="bg-light rounded p-3 mb-3">
            <p className="mb-1"><strong>{t('common.date')}:</strong> {existingSession?.session_date}</p>
            <p className="mb-0"><strong>{t('common.time')}:</strong> {existingSession?.start_time} - {existingSession?.end_time}</p>
          </div>
          <p className="text-muted small">
            {t('instructor.generateQR.activeSessionNote')}
            <br />
            <strong>{t('common.note')}:</strong> {t('instructor.generateQR.activeSessionNoteWarning')}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => generateQR(false, true)}>{t('instructor.generateQR.createNew')}</Button>
          <Button variant="primary" onClick={() => generateQR(true, false)}>{t('instructor.generateQR.useExisting')}</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default GenerateQR;