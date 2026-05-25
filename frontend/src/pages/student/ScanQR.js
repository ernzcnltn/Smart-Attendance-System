import React, { useEffect, useRef, useState } from 'react';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/errorCodes';

const ScanQR = ({ expectedCourseUUID }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
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
    setLocationReady(false);
    setLocation(null);
    if (!navigator.geolocation) {
      setLocationError(t('scanQR.locationDenied'));
      setGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationReady(true);
        setGettingLocation(false);
      },
      () => {
        setLocationError(t('scanQR.locationDenied'));
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startScanner = async () => {
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
            const response = await api.post('/sessions/attend', {
              session_uuid: parsed.session_uuid,
              qr_token: parsed.qr_token,
              latitude: location?.latitude || 0,
              longitude: location?.longitude || 0,
              expected_course_uuid: expectedCourseUUID || null
            });
            const courseCode = response.data?.data?.course_code || '';
            const courseName = response.data?.data?.course_name || '';
            setSuccess(courseCode ? t('scanQR.attendanceMarked', { code: courseCode, name: courseName }) : t('scanQR.attendanceMarkedSuccess'));
            setDone(true);
          } catch (err) {
            setError(getErrorMessage(err, t));
          }
        },
        () => {}
      );
    } catch (err) {
      setScanning(false);
      setError(t('faceAttendance.cameraError'));
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
        ← {t('common.back')}
      </Button>
      <Card className="shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Header><strong>{t('scanQR.title')}</strong></Card.Header>
        <Card.Body className="text-center">
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          {gettingLocation && (
            <Alert variant="info" className="small">
              <Spinner size="sm" className="me-2" />
              {t('scanQR.gettingLocation')}
            </Alert>
          )}
          {locationError && (
            <Alert variant="warning" className="small">
              {locationError}
              <div><Button variant="link" size="sm" className="p-0 mt-1" onClick={getLocation}>{t('scanQR.tryAgain')}</Button></div>
            </Alert>
          )}
          {locationReady && (
            <Alert variant="success" className="small">
              ✓ {t('scanQR.locationReady')}
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
                  disabled={gettingLocation}
                >
                  {gettingLocation ? t('scanQR.gettingLocation') : t('scanQR.startScan')}
                </Button>
              ) : (
                <Button variant="danger" className="mt-3 w-100" onClick={stopScanner}>
                  {t('scanQR.stopScan')}
                </Button>
              )}
            </>
          )}

          {done && (
            <Button variant="success" className="mt-3 w-100" onClick={() => navigate('/student')}>
              {t('scanQR.goDashboard')}
            </Button>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ScanQR;