import React, { useRef, useState, useEffect } from 'react';
import { Container, Card, Button, Alert, Spinner, Modal, Badge } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import api from '../../services/api';
import { checkChallenge } from '../../services/faceService';
import ScanQR from './ScanQR';
import { useAuth } from '../../context/AuthContext';

// ─── Modal config ───
// ─── Modal config ───
const MODALS = {
  spoof: {
    title: 'Spoofing Detected',
    iconClass: 'bi bi-shield-x',
    heading: 'Fraudulent Attempt Detected!',
    body: 'A photo, screen, or video was detected instead of a real face. Please look directly into the camera with your real face.',
    tips: ['Do not use a photo or screen', 'Do not show a video recording', 'Ensure your face is clearly visible'],
    color: '#dc2626'
  },
  multiple_faces: {
    title: 'Multiple People Detected',
    iconClass: 'bi bi-people-fill',
    heading: 'Only One Person Allowed!',
    body: 'More than one face was detected in the camera. Please make sure you are the only person visible.',
    tips: ['Ensure only your face is in the frame', 'Ask others to step out of camera view', 'Move to a private location'],
    color: '#dc2626'
  },
  mismatch: {
    title: 'Identity Mismatch',
    iconClass: 'bi bi-person-x-fill',
    heading: 'Face Does Not Match!',
    body: 'Your face does not match the registered face. You can only mark attendance for yourself.',
    tips: ['Make sure you are registered in the system', 'Do not attempt to mark attendance for others', 'Contact your instructor if you believe this is an error'],
    color: '#7c3aed'
  },
  wrong_person: {
  title: 'Wrong Person Detected',
  iconClass: 'bi bi-person-fill-x',
  heading: 'Unauthorized Attempt!',
  body: 'The face in the camera does not match the registered student. Only the registered student can mark attendance.',
  tips: [
    'Only you can mark your own attendance',
    'Do not allow others to use your account',
    'Contact your instructor if you believe this is an error'
  ],
  color: '#dc2626'
},
  too_slow: {
    title: 'Time Limit Exceeded',
    iconClass: 'bi bi-clock-history',
    heading: 'Too Slow!',
    body: 'You did not complete both challenges within the time limit. Please perform the second challenge more quickly after the first.',
    tips: [
      'Complete the second challenge within 10 seconds of the first',
      'Ensure good lighting so the camera detects you faster',
      'Practice the challenge before starting'
    ],
    color: '#dc2626'
  }
};

const SecurityModal = ({ modalType, onClose }) => {
  if (!modalType) return null;
  const config = MODALS[modalType];
  if (!config) return null;
  return (
    <Modal show={!!modalType} onHide={onClose} centered>
      <Modal.Header closeButton style={{ background: config.color, color: 'white', borderBottom: 'none' }}>
        <Modal.Title style={{ fontSize: '1rem' }}>
          <i className={config.iconClass} style={{ marginRight: '8px' }} />
          {config.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center py-4 px-4">
        <i className={config.iconClass} style={{ fontSize: '3rem', color: config.color, marginBottom: '12px', display: 'block' }} />
        <h5 className="fw-bold mb-2">{config.heading}</h5>
        <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>{config.body}</p>
        <div className="text-start p-3 rounded" style={{ background: '#f8f9fa', fontSize: '13px' }}>
          <strong>What to do:</strong>
          <ul className="mb-0 mt-2">
            {config.tips.map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
        </div>
        <p className="small mt-3 mb-0" style={{ color: config.color }}>
          <i className="bi bi-exclamation-circle me-1" />
          This attempt has been flagged. Continued attempts may result in disciplinary action.
        </p>
      </Modal.Body>
      <Modal.Footer style={{ borderTop: 'none' }}>
        <Button className="w-100" style={{ background: config.color, border: 'none' }} onClick={onClose}>
          I understand, try again
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const FaceAttendance = () => {
  const navigate = useNavigate();
  const { courseUUID } = useParams();
  const webcamRef = useRef(null);
  const [step, setStep] = useState('face');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
const { user } = useAuth();
  const [challengePhase, setChallengePhase] = useState(1);
  const [challenge1, setChallenge1] = useState(null);
  const [challenge2, setChallenge2] = useState(null);
  const [challenge1Image, setChallenge1Image] = useState(null);
  const [challenge1Time, setChallenge1Time] = useState(null);
  const [detected, setDetected] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [loadingChallenge, setLoadingChallenge] = useState(true);
  const [statusText, setStatusText] = useState('');
  const [activeModal, setActiveModal] = useState(null);

  const intervalRef = useRef(null);
  const livenessFramesRef = useRef([]);

  useEffect(() => {
    fetchFirstChallenge();
    return () => stopDetection();
  }, []);

  useEffect(() => {
    const currentChallenge = challengePhase === 1 ? challenge1 : challenge2;
    if (currentChallenge && !detected && !loading) {
      startDetection();
    }
    return () => stopDetection();
  }, [challenge1, challenge2, challengePhase]);

  const fetchFirstChallenge = async () => {
    setLoadingChallenge(true);
    setDetected(false);
    setError('');
    setChallengePhase(1);
    setChallenge1(null);
    setChallenge2(null);
    setChallenge1Image(null);
    setChallenge1Time(null);
    setStatusText('');
    livenessFramesRef.current = [];
    stopDetection();
    try {
      const response = await api.get('/face/challenge?type=verification');
      setChallenge1(response.data.data.challenge);
    } catch (err) {
      setError('Failed to load challenge. Please refresh.');
    } finally {
      setLoadingChallenge(false);
    }
  };

  const fetchSecondChallenge = async (excludeId) => {
    setDetected(false);
    setStatusText('Now do the next challenge quickly!');
    try {
      const response = await api.get(`/face/challenge?type=verification&exclude=${excludeId}`);
      setChallenge2(response.data.data.challenge);
      setChallengePhase(2);
      setStatusText('');
    } catch (err) {
      setError('Failed to load second challenge.');
    }
  };

  const startDetection = () => {
    stopDetection();
    intervalRef.current = setInterval(async () => {
      if (!webcamRef.current || capturing) return;
      try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        const currentChallenge = challengePhase === 1 ? challenge1 : challenge2;
        if (!currentChallenge) return;

        // Liveness frames topla
        if (livenessFramesRef.current.length < 10) {
          livenessFramesRef.current.push(imageSrc);
        } else {
          livenessFramesRef.current.shift();
          livenessFramesRef.current.push(imageSrc);
        }

        
const response = await checkChallenge(imageSrc, currentChallenge.id, user?.uuid);
        // Birden fazla yuz
        if (response.multiple_faces) {
          stopDetection();
          setActiveModal('multiple_faces');
          return;
        }

        // Spoof tespiti
        if (response.spoof) {
          stopDetection();
          setActiveModal('spoof');
          return;
        }
      
        if (response.wrong_person) {
  stopDetection();
  setActiveModal('wrong_person');
  return;
}

        if (response.detected) {
          stopDetection();
          setDetected(true);

          if (challengePhase === 1) {
            setChallenge1Image(imageSrc);
            setChallenge1Time(Date.now());
            setStatusText('First challenge passed! Do the next one quickly!');
            await new Promise(r => setTimeout(r, 500));
            setDetected(false);
            await fetchSecondChallenge(currentChallenge.id);
          } else {
            

            setCapturing(true);
            setStatusText('Verifying identity...');

            const finalFrames = [];
            for (let i = 0; i < 3; i++) {
              await new Promise(r => setTimeout(r, 400));
              const frame = webcamRef.current?.getScreenshot();
              if (frame) finalFrames.push(frame);
            }

            const allFrames = [...livenessFramesRef.current, ...finalFrames];
            const selectedFrames = [];
            if (allFrames.length >= 6) {
              selectedFrames.push(allFrames[0]);
              selectedFrames.push(allFrames[Math.floor(allFrames.length / 2)]);
              selectedFrames.push(allFrames[allFrames.length - 1]);
            } else {
              selectedFrames.push(...allFrames.slice(-3));
            }

            await handleVerify(imageSrc, selectedFrames);
            setCapturing(false);
          }
        }
      } catch (err) {}
    }, 1500);
  };

  const stopDetection = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleVerify = async (secondImage, livenessFrames) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/face/verify', {
        challenges: [
          { id: challenge1.id, image: challenge1Image, timestamp: challenge1Time },
          { id: challenge2.id, image: secondImage, timestamp: Date.now() }
        ],
        liveness_frames: livenessFrames
      });

      if (response.data.data.verified) {
        setStep('qr');
      } else {
        stopDetection();
        setActiveModal('mismatch');
      }
    } catch (err) {
      const data = err.response?.data;
      const message = data?.message || 'Face verification failed.';
      const msg = message.toLowerCase();

      if (msg.includes('multiple faces')) {
        stopDetection();
        setActiveModal('multiple_faces');
      } else if (
        msg.includes('spoof') || msg.includes('screen') || msg.includes('display') ||
        msg.includes('real face') || msg.includes('liveness') || msg.includes('natural movement') ||
        msg.includes('photo') || msg.includes('video')
      ) {
        stopDetection();
        setActiveModal('spoof');
      } else if (msg.includes('does not match')) {
        stopDetection();
        setActiveModal('mismatch');
      } else if (msg.includes('too slow')) {
        stopDetection();
        setActiveModal('too_slow');
      } else {
        setError(message);
        setDetected(false);
        setCapturing(false);
        await fetchFirstChallenge();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = async () => {
    setActiveModal(null);
    setDetected(false);
    setCapturing(false);
    await fetchFirstChallenge();
  };

  if (step === 'qr') {
    return (
      <Container>
        <Alert variant="success" className="mb-3">
          Face verified! Now scan the QR code to mark your attendance.
        </Alert>
        <ScanQR expectedCourseUUID={courseUUID} />
      </Container>
    );
  }

  const currentChallenge = challengePhase === 1 ? challenge1 : challenge2;

  return (
    <Container>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => { stopDetection(); navigate('/student'); }}>
        &larr; Back
      </Button>

      <Card className="shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <strong>Face Verification</strong>
            <Badge bg={challengePhase === 1 ? 'primary' : 'success'}>
              Challenge {challengePhase} / 2
            </Badge>
          </div>
        </Card.Header>
        <Card.Body className="text-center">
          {error && <Alert variant="danger">{error}</Alert>}

          {loadingChallenge ? (
            <Spinner animation="border" className="mb-3" />
          ) : currentChallenge && (
            <Alert variant={detected ? 'success' : 'info'} className="mb-3">
              {detected ? (
                <strong>{statusText || 'Detected! Processing...'}</strong>
              ) : (
                <>
                  <strong>Challenge {challengePhase}:</strong> {currentChallenge.instruction}
                  {challengePhase === 2 && (
                    <div className="small text-danger mt-1">Complete quickly! Time is limited.</div>
                  )}
                </>
              )}
            </Alert>
          )}

          {loading && (
            <Alert variant="warning" className="mb-3">
              <Spinner size="sm" className="me-2" />
              Verifying your identity...
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
              mirrored={true}
            />
            {!detected && !loading && (
              <div style={{
                position: 'absolute', bottom: '20px', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.6)', color: 'white',
                padding: '6px 14px', borderRadius: '20px',
                fontSize: '13px', whiteSpace: 'nowrap'
              }}>
                Detecting...
              </div>
            )}
            {detected && statusText && (
              <div style={{
                position: 'absolute', bottom: '20px', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(34,197,94,0.8)', color: 'white',
                padding: '6px 14px', borderRadius: '20px',
                fontSize: '13px', whiteSpace: 'nowrap'
              }}>
                {statusText}
              </div>
            )}
          </div>

          <p className="text-muted small">
            Complete both challenges to verify your identity.
            <br />
            <small>You must complete the second challenge within 10 seconds.</small>
          </p>
        </Card.Body>
      </Card>

      <SecurityModal modalType={activeModal} onClose={handleCloseModal} />
    </Container>
  );
};

export default FaceAttendance;