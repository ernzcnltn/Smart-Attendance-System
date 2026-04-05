import React, { useRef, useState, useEffect } from 'react';
import { Container, Card, Alert, Spinner, ProgressBar, Badge, Modal, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import api from '../../services/api';
import { checkChallenge } from '../../services/faceService';
import { useAuth } from '../../context/AuthContext';

const TOTAL_STEPS = 3;

const FaceRegister = ({ onComplete }) => {
  const navigate = useNavigate();
  const { checkFaceStatus } = useAuth();
  const webcamRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [loadingChallenge, setLoadingChallenge] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [detected, setDetected] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [spoofingModal, setSpoofingModal] = useState(false);
  const intervalRef = useRef(null);
  const registrationComplete = useRef(false);

useEffect(() => {
  fetchChallenge(0);
  return () => {
    stopDetection();
  };
}, []);

  useEffect(() => {
    if (challenge && !detected && !loading) {
      startDetection();
    }
    return () => stopDetection();
  }, [challenge]);

  const fetchChallenge = async (step) => {
    setLoadingChallenge(true);
    setDetected(false);
    setError('');
    stopDetection();
    try {
      const response = await api.get(`/face/challenge?type=registration&step=${step}`);
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
          await handleAutoRegister(imageSrc);
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

  const handleAutoRegister = async (imageSrc) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/face/register', {
        image: imageSrc,
        challenge_id: challenge.id,
        step: currentStep
      });

      const { is_complete, next_step } = response.data.data;

      if (is_complete) {
        registrationComplete.current = true;
        setSuccess('Face registered successfully!');
        await checkFaceStatus();
        setTimeout(() => {
          if (onComplete) onComplete();
          else navigate('/student');
        }, 3000);
      } else {
        setCurrentStep(next_step);
        await fetchChallenge(next_step);
      }
    } catch (err) {
      const data = err.response?.data;
      const message = data?.message || 'Failed to register. Please try again.';

      if (
        message.toLowerCase().includes('liveness') ||
        message.toLowerCase().includes('real face') ||
        message.toLowerCase().includes('photo') ||
        message.toLowerCase().includes('spoof')
      ) {
        stopDetection();
         setSpoofingModal(true);
  } else if (data?.duplicate_face) {
    stopDetection();
    setError('This face is already registered to another account. Please use your own face.');
  } else if (data?.face_covered) {
    setError(message);
    setDetected(false);
    startDetection();
  } else {
    setError(message);
    setDetected(false);
        startDetection();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSpoofingModal = async () => {
    setSpoofingModal(false);
    setDetected(false);
    setCapturing(false);
    await fetchChallenge(currentStep);
  };

  return (
    <Container className="mt-4">
      <Card className="shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <strong>Face Registration</strong>
            <Badge bg="primary">Step {currentStep + 1} / {TOTAL_STEPS}</Badge>
          </div>
        </Card.Header>
        <Card.Body className="text-center">
          <ProgressBar
            now={(currentStep / TOTAL_STEPS) * 100}
            className="mb-3"
            variant="primary"
          />

          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          {loadingChallenge ? (
            <Spinner animation="border" className="mb-3" />
          ) : challenge && (
            <Alert variant={detected ? 'success' : 'info'} className="mb-3">
              {detected ? (
                <><strong>✓ Detected!</strong> Processing...</>
              ) : (
                <><strong>Challenge {currentStep + 1}:</strong> {challenge.instruction}</>
              )}
            </Alert>
          )}

          {loading && (
            <Alert variant="warning" className="mb-3">
              <Spinner size="sm" className="me-2" />
              Saving step {currentStep + 1}...
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
            Perform the challenge above. Photo will be taken automatically.
          </p>
        </Card.Body>
      </Card>

      <Modal show={spoofingModal} onHide={handleCloseSpoofingModal} centered>
        <Modal.Header closeButton style={{ background: '#dc3545', color: 'white' }}>
          <Modal.Title> Spoofing Detected</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <h5>Fraudulent Attempt Detected!</h5>
          <p className="text-muted">
            A photo or screen was detected instead of a real face.
            Please use your actual face for registration.
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

export default FaceRegister;