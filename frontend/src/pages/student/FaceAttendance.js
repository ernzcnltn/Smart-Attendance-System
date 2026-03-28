import React, { useRef, useState, useCallback } from 'react';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import api from '../../services/api';
import ScanQR from './ScanQR';

const FaceAttendance = () => {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const [step, setStep] = useState('face');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
  }, [webcamRef]);

  const handleVerify = async () => {
    if (!capturedImage) return setError('Please capture your photo first.');
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/face/verify', { image: capturedImage });
      if (response.data.data.verified) {
        setStep('qr');
      } else {
        setError('Face verification failed. Please try again.');
        setCapturedImage(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Face verification failed. Please try again.');
      setCapturedImage(null);
    } finally {
      setLoading(false);
    }
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
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => navigate('/student')}>
        ← Back
      </Button>
      <Card className="shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Header>
          <strong>Step 1 of 2 — Face Verification</strong>
        </Card.Header>
        <Card.Body className="text-center">
          {error && <Alert variant="danger">{error}</Alert>}

          <p className="text-muted small mb-3">
            First, verify your identity with face recognition. Then you will be able to scan the QR code.
          </p>

          {!capturedImage ? (
            <>
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="rounded mb-3"
                style={{ width: '100%', maxWidth: '400px' }}
                videoConstraints={{ facingMode: 'user' }}
                onUserMediaError={() => setError('Camera access denied. Please allow camera permission.')}
              />
              <Button variant="primary" className="w-100" onClick={capture}>
                Capture Photo
              </Button>
            </>
          ) : (
            <>
              <img
                src={capturedImage}
                alt="Captured"
                className="rounded mb-3"
                style={{ width: '100%', maxWidth: '400px' }}
              />
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  className="w-50"
                  onClick={() => setCapturedImage(null)}
                  disabled={loading}
                >
                  Retake
                </Button>
                <Button
                  variant="success"
                  className="w-50"
                  onClick={handleVerify}
                  disabled={loading}
                >
                  {loading ? <Spinner size="sm" /> : 'Verify Face'}
                </Button>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default FaceAttendance;