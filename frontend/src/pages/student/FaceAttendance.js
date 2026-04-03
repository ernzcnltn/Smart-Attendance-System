import React, { useRef, useState, useEffect } from 'react';
import { Container, Card, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import api from '../../services/api';
import { checkChallenge } from '../../services/faceService';
import ScanQR from './ScanQR';

const FaceAttendance = () => {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const [step, setStep] = useState('face');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [loadingChallenge, setLoadingChallenge] = useState(true);
  const [detected, setDetected] = useState(false);
  const [capturing, setCapturing] = useState(false);
const [spoofingModal, setSpoofingModal] = useState({ show: false, type: 'spoof' });  const intervalRef = useRef(null);

  useEffect(() => {
    fetchChallenge();
    return () => stopDetection();
  }, []);

  useEffect(() => {
    if (challenge && !detected && !loading) {
      startDetection();
    }
    return () => stopDetection();
  }, [challenge]);

  const fetchChallenge = async () => {
    setLoadingChallenge(true);
    setDetected(false);
    setError('');
    stopDetection();
    try {
      const response = await api.get('/face/challenge?type=verification');
      setChallenge(response.data.data.challenge);
    } catch (err) {
      setError('Failed to load challenge. Please refresh.');
    } finally {
      setLoadingChallenge(false);
    }
  };

  const startDetection = () => {
    stopDetection();
    intervalRef.current = setInterval(async () => {
      if (!webcamRef.current || capturing) return;
      try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc || !challenge) return;

        const response = await checkChallenge(imageSrc, challenge.id);

        if (response.detected) {
          stopDetection();
          setDetected(true);
          setCapturing(true);
          await handleAutoVerify(imageSrc);
          setCapturing(false);
        }
      } catch (err) {}
    }, 3000);
  };

  const stopDetection = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleAutoVerify = async (imageSrc) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/face/verify', {
        image: imageSrc,
        challenge_id: challenge.id
      });

    if (response.data.data.verified) {
  setStep('qr');
} else {
  stopDetection();
  setSpoofingModal({ show: true, type: 'mismatch' });
}

     } catch (err) {
      const data = err.response?.data;
      const message = data?.message || 'Face verification failed.';

    if (
  message.toLowerCase().includes('liveness') ||
  message.toLowerCase().includes('real face') ||
  message.toLowerCase().includes('photo') ||
  message.toLowerCase().includes('spoof')
) {
  stopDetection();
  setSpoofingModal({ show: true, type: 'spoof' });
} else if (
  message.toLowerCase().includes('does not match') ||
  message.toLowerCase().includes('already registered') ||
  message.toLowerCase().includes('duplicate')
) {
  stopDetection();
  setSpoofingModal({ show: true, type: 'mismatch' });
} else {
        setError(message);
        setDetected(false);
        setCapturing(false);
        await fetchChallenge();
      }
    }finally {
      setLoading(false);
    }
  };

  const handleCloseSpoofingModal = async () => {
  setSpoofingModal({ show: false, type: 'spoof' });
  setDetected(false);
  setCapturing(false);
  await fetchChallenge();
};

  if (step === 'qr') {
    return (
      <Container>
        <Alert variant="success" className="mb-3">
          Face verified! Now scan the QR code to mark your attendance.
        </Alert>
        <ScanQR />
      </Container>
    );
  }

  return (
    <Container>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => { stopDetection(); navigate('/student'); }}>
        ← Back
      </Button>
      <Card className="shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Header>
          <strong>Step 1 of 2 — Face Verification</strong>
        </Card.Header>
        <Card.Body className="text-center">
          {error && <Alert variant="danger">{error}</Alert>}

          {loadingChallenge ? (
            <Spinner animation="border" className="mb-3" />
          ) : challenge && (
            <Alert variant={detected ? 'success' : 'info'} className="mb-3">
              {detected ? (
                <><strong>✓ Detected!</strong> Verifying...</>
              ) : (
                <><strong>Challenge:</strong> {challenge.instruction}</>
              )}
            </Alert>
          )}

          {loading && (
            <Alert variant="warning" className="mb-3">
              <Spinner size="sm" className="me-2" />
              Verifying your face...
            </Alert>
          )}

          <div style={{ position: 'relative' }}>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="rounded mb-3"
              style={{ width: '100%', maxWidth: '400px' }}
              videoConstraints={{ facingMode: 'user' }}
              onUserMediaError={() => setError('Camera access denied.')}
            />
            {!detected && !loading && (
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                whiteSpace: 'nowrap'
              }}>
                 Detecting...
              </div>
            )}
          </div>

          <p className="text-muted small">
            Perform the challenge above. Verification will happen automatically.
          </p>
        </Card.Body>
      </Card>

      <Modal show={spoofingModal.show} onHide={handleCloseSpoofingModal} centered>
  <Modal.Header closeButton style={{ background: '#dc3545', color: 'white' }}>
    <Modal.Title>
      {spoofingModal.type === 'spoof' ? 'Spoofing Detected' : 'Identity Mismatch'}
    </Modal.Title>
  </Modal.Header>
  <Modal.Body className="text-center py-4">
    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
    <h5>
      {spoofingModal.type === 'spoof' ? 'Fraudulent Attempt Detected!' : 'Face Does Not Match!'}
    </h5>
    <p className="text-muted">
      {spoofingModal.type === 'spoof'
        ? 'A photo or screen was detected instead of a real face. Please use your actual face for attendance verification.'
        : 'Your face does not match the registered face for this account. You can only mark attendance for yourself.'}
    </p>
    <p className="small text-danger">
      This attempt has been flagged. Continued attempts may result in disciplinary action.
    </p>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="danger" className="w-100" onClick={handleCloseSpoofingModal}>
      I understand, try again with my real face
    </Button>
  </Modal.Footer>
</Modal>
    </Container>
  );
};

export default FaceAttendance;