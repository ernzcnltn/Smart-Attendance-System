import React, { useRef, useState, useCallback } from 'react';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const FaceRegister = ({ onComplete }) => {
  const navigate = useNavigate();
  const { checkFaceStatus } = useAuth();
  const webcamRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
  }, [webcamRef]);

  const handleRegister = async () => {
    if (!capturedImage) return setError('Please capture your photo first.');
    setLoading(true);
    setError('');
    try {
      await api.post('/face/register', { image: capturedImage });
      setSuccess('Face registered successfully!');
      await checkFaceStatus();
      setTimeout(() => {
        if (onComplete) onComplete();
        else navigate('/student');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register face. Please try again.');
      setCapturedImage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-4">
      <Card className="shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Header><strong>Face Registration</strong></Card.Header>
        <Card.Body className="text-center">
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <p className="text-muted small mb-3">
            Please position your face clearly in the camera. Make sure you are in a well-lit area.
            This is required to use the attendance system.
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
                  onClick={handleRegister}
                  disabled={loading}
                >
                  {loading ? <Spinner size="sm" /> : 'Register Face'}
                </Button>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default FaceRegister;