import React, { useEffect, useRef, useState } from 'react';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../services/api';

const SCHOOL_LAT = parseFloat(process.env.REACT_APP_SCHOOL_LAT);
const SCHOOL_LNG = parseFloat(process.env.REACT_APP_SCHOOL_LNG);
const SCHOOL_RADIUS = parseFloat(process.env.REACT_APP_SCHOOL_RADIUS) || 150;

const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const ScanQR = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    getLocation();
    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) scannerRef.current.stop().catch(() => {});
        } catch (e) {}
        scannerRef.current = null;
      }
    };
  }, []);

  const getLocation = () => {
    setGettingLocation(true);
    setLocationError('');
    setLocationVerified(false);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({ latitude: lat, longitude: lng });
        setGettingLocation(false);

        const distance = getDistanceMeters(SCHOOL_LAT, SCHOOL_LNG, lat, lng);
        if (distance > SCHOOL_RADIUS) {
  setLocationError(`You must be within ${SCHOOL_RADIUS} meters of the school. Current distance: ${Math.round(distance)}m.`);
  setLocationVerified(false);
} else {
  setLocationVerified(true);
}
      },
      (err) => {
        setLocationError('Location access denied. Please allow location permission.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startScanner = async () => {
    if (!locationVerified) {
      setError('You must be at school to mark attendance.');
      return;
    }
    setError('');
    setScanning(true);

    const html5QrCode = new Html5Qrcode('qr-reader');
    scannerRef.current = html5QrCode;

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await html5QrCode.stop();
          setScanning(false);
          try {
            const parsed = JSON.parse(decodedText);
            await api.post('/sessions/attend', {
              session_uuid: parsed.session_uuid,
              qr_token: parsed.qr_token,
              latitude: location.latitude,
              longitude: location.longitude
            });
            setSuccess('Attendance marked successfully!');
            setDone(true);
          } catch (err) {
            setError(err.response?.data?.message || 'Invalid QR code or attendance already marked.');
          }
        },
        () => {}
      );
    } catch (err) {
      setScanning(false);
      setError('Camera access denied. Please allow camera permission.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) await scannerRef.current.stop();
      } catch (e) {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  return (
    <Container>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => { stopScanner(); navigate('/student'); }}>
        ← Back
      </Button>
      <Card className="shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Header><strong>Scan QR Code</strong></Card.Header>
        <Card.Body className="text-center">
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          {gettingLocation && (
            <Alert variant="info">
              <Spinner size="sm" className="me-2" />
              Getting your location...
            </Alert>
          )}

          {locationError && (
            <Alert variant="danger">
              {locationError}
              <div>
                <Button variant="link" size="sm" onClick={getLocation}>Try again</Button>
              </div>
            </Alert>
          )}

          {locationVerified && (
            <Alert variant="success" className="small">
              Location verified. You are at school.
            </Alert>
          )}

          {!done && (
            <>
              <div id="qr-reader" style={{ width: '100%' }} />
              {!scanning ? (
                <Button
                  variant="primary"
                  className="mt-3 w-100"
                  onClick={startScanner}
                  disabled={!locationVerified || gettingLocation}
                >
                  {!locationVerified && !gettingLocation && !locationError
                    ? 'Waiting for location...'
                    : 'Start Camera & Scan'}
                </Button>
              ) : (
                <Button variant="danger" className="mt-3 w-100" onClick={stopScanner}>
                  Stop Scanner
                </Button>
              )}
            </>
          )}

          {done && (
            <Button variant="success" className="mt-3 w-100" onClick={() => navigate('/student')}>
              Go to Dashboard
            </Button>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ScanQR;