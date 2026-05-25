import React, { useRef, useState, useEffect } from 'react';
import { Container, Card, Button, Alert, Spinner, Modal, Badge } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Webcam from 'react-webcam';
import api from '../../services/api';
import { checkChallenge } from '../../services/faceService';
import ScanQR from './ScanQR';
import { useAuth } from '../../context/AuthContext';

const SecurityModal = ({ modalType, onClose }) => {
  const { t } = useTranslation();
  if (!modalType) return null;

  const MODALS = {
    spoof: { title: t('faceAttendance.modals.spoof.title'), iconClass: 'bi bi-shield-x', heading: t('faceAttendance.modals.spoof.heading'), body: t('faceAttendance.modals.spoof.body'), tips: t('faceAttendance.modals.spoof.tips', { returnObjects: true }), color: '#dc2626' },
    multiple_faces: { title: t('faceAttendance.modals.multiple_faces.title'), iconClass: 'bi bi-people-fill', heading: t('faceAttendance.modals.multiple_faces.heading'), body: t('faceAttendance.modals.multiple_faces.body'), tips: t('faceAttendance.modals.multiple_faces.tips', { returnObjects: true }), color: '#dc2626' },
    mismatch: { title: t('faceAttendance.modals.mismatch.title'), iconClass: 'bi bi-person-x-fill', heading: t('faceAttendance.modals.mismatch.heading'), body: t('faceAttendance.modals.mismatch.body'), tips: t('faceAttendance.modals.mismatch.tips', { returnObjects: true }), color: '#7c3aed' },
    wrong_person: { title: t('faceAttendance.modals.wrong_person.title'), iconClass: 'bi bi-person-fill-x', heading: t('faceAttendance.modals.wrong_person.heading'), body: t('faceAttendance.modals.wrong_person.body'), tips: t('faceAttendance.modals.wrong_person.tips', { returnObjects: true }), color: '#dc2626' },
    too_slow: { title: t('faceAttendance.modals.too_slow.title'), iconClass: 'bi bi-clock-history', heading: t('faceAttendance.modals.too_slow.heading'), body: t('faceAttendance.modals.too_slow.body'), tips: t('faceAttendance.modals.too_slow.tips', { returnObjects: true }), color: '#dc2626' },
  };

  const config = MODALS[modalType];
  if (!config) return null;
  return (
    <Modal show={!!modalType} onHide={onClose} centered>
      <Modal.Header closeButton style={{ background: config.color, color: 'white', borderBottom: 'none' }}>
        <Modal.Title style={{ fontSize: '1rem' }}><i className={config.iconClass} style={{ marginRight: '8px' }} />{config.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center py-4 px-4">
        <i className={config.iconClass} style={{ fontSize: '3rem', color: config.color, marginBottom: '12px', display: 'block' }} />
        <h5 className="fw-bold mb-2">{config.heading}</h5>
        <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>{config.body}</p>
        <div className="text-start p-3 rounded" style={{ background: '#f8f9fa', fontSize: '13px' }}>
          <strong>What to do:</strong>
          <ul className="mb-0 mt-2">{Array.isArray(config.tips) && config.tips.map((tip, i) => <li key={i}>{tip}</li>)}</ul>
        </div>
        <p className="small mt-3 mb-0" style={{ color: config.color }}>⚠ {t('faceAttendance.modals.flagged')}</p>
      </Modal.Body>
      <Modal.Footer style={{ borderTop: 'none' }}>
        <Button className="w-100" style={{ background: config.color, border: 'none' }} onClick={onClose}>{t('faceAttendance.modals.understand')}</Button>
      </Modal.Footer>
    </Modal>
  );
};

const FaceAttendance = () => {
  const navigate = useNavigate();
  const { courseUUID } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const webcamRef = useRef(null);
  const [step, setStep] = useState('face');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
  const challengePhaseRef = useRef(1);
  const challenge1Ref = useRef(null);
  const challenge2Ref = useRef(null);

  useEffect(() => { fetchFirstChallenge(); return () => stopDetection(); }, []);
  useEffect(() => {
    const currentChallenge = challengePhaseRef.current === 1 ? challenge1Ref.current : challenge2Ref.current;
    if (currentChallenge && !detected && !loading) startDetection();
    return () => stopDetection();
  }, [challenge1, challenge2, challengePhase]);

  const fetchFirstChallenge = async () => {
    setLoadingChallenge(true); setDetected(false); setError('');
    challengePhaseRef.current = 1;
    setChallengePhase(1); setChallenge1(null); setChallenge2(null);
    challenge1Ref.current = null; challenge2Ref.current = null;
    setChallenge1Image(null); setChallenge1Time(null); setStatusText('');
    livenessFramesRef.current = []; stopDetection();
    try {
      const response = await api.get('/face/challenge?type=verification');
      challenge1Ref.current = response.data.data.challenge;
      setChallenge1(response.data.data.challenge);
    } catch { setError('Failed to load challenge.'); }
    finally { setLoadingChallenge(false); }
  };

  const fetchSecondChallenge = async (excludeId) => {
    setDetected(false); setStatusText(t('faceAttendance.firstPassed'));
    try {
      const response = await api.get(`/face/challenge?type=verification&exclude=${excludeId}`);
      challenge2Ref.current = response.data.data.challenge;
      setChallenge2(response.data.data.challenge);
      challengePhaseRef.current = 2;
      setChallengePhase(2); setStatusText('');
    } catch { setError('Failed to load second challenge.'); }
  };

  const startDetection = () => {
    stopDetection();
    intervalRef.current = setInterval(async () => {
      if (!webcamRef.current || capturing) return;
      try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;
        const currentChallenge = challengePhaseRef.current === 1 ? challenge1Ref.current : challenge2Ref.current;
        if (!currentChallenge) return;
        if (livenessFramesRef.current.length < 10) livenessFramesRef.current.push(imageSrc);
        else { livenessFramesRef.current.shift(); livenessFramesRef.current.push(imageSrc); }

        const response = await checkChallenge(imageSrc, currentChallenge.id, user?.uuid);
        if (response.multiple_faces) { stopDetection(); setActiveModal('multiple_faces'); return; }
        if (response.spoof) { stopDetection(); setActiveModal('spoof'); return; }
        if (response.wrong_person) { stopDetection(); setActiveModal('wrong_person'); return; }
        if (response.detected) {
          stopDetection(); setDetected(true);
          if (challengePhaseRef.current === 1) {
            setChallenge1Image(imageSrc); setChallenge1Time(Date.now());
            setStatusText(t('faceAttendance.firstPassed'));
            await new Promise(r => setTimeout(r, 500));
            setDetected(false); await fetchSecondChallenge(currentChallenge.id);
          } else {
            setCapturing(true); setStatusText(t('faceAttendance.verifying'));
            const finalFrames = [];
            for (let i = 0; i < 3; i++) { await new Promise(r => setTimeout(r, 400)); const frame = webcamRef.current?.getScreenshot(); if (frame) finalFrames.push(frame); }
            const allFrames = [...livenessFramesRef.current, ...finalFrames];
            const selectedFrames = allFrames.length >= 6
              ? [allFrames[0], allFrames[Math.floor(allFrames.length / 2)], allFrames[allFrames.length - 1]]
              : allFrames.slice(-3);
            await handleVerify(imageSrc, selectedFrames);
            setCapturing(false);
          }
        }
      } catch {}
    }, 1500);
  };

  const stopDetection = () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };

  const handleVerify = async (secondImage, livenessFrames) => {
    setLoading(true); setError('');
    try {
      const response = await api.post('/face/verify', {
        challenges: [
          { id: challenge1Ref.current.id, image: challenge1Image, timestamp: challenge1Time },
          { id: challenge2Ref.current.id, image: secondImage, timestamp: Date.now() }
        ],
        liveness_frames: livenessFrames
      });
      if (response.data.data.verified) setStep('qr');
      else { stopDetection(); setActiveModal('mismatch'); }
    } catch (err) {
      const msg = (err.response?.data?.message || '').toLowerCase();
      if (msg.includes('multiple faces')) { stopDetection(); setActiveModal('multiple_faces'); }
      else if (msg.includes('spoof') || msg.includes('screen') || msg.includes('liveness') || msg.includes('photo')) { stopDetection(); setActiveModal('spoof'); }
      else if (msg.includes('does not match')) { stopDetection(); setActiveModal('mismatch'); }
      else if (msg.includes('too slow')) { stopDetection(); setActiveModal('too_slow'); }
      else { setError(err.response?.data?.message || 'Face verification failed.'); setDetected(false); setCapturing(false); await fetchFirstChallenge(); }
    } finally { setLoading(false); }
  };

  const handleCloseModal = async () => { setActiveModal(null); setDetected(false); setCapturing(false); await fetchFirstChallenge(); };

  if (step === 'qr') {
    return (
      <Container>
        <Alert variant="success" className="mb-3">{t('faceAttendance.faceVerified')}</Alert>
        <ScanQR expectedCourseUUID={courseUUID} />
      </Container>
    );
  }

  const currentChallenge = challengePhase === 1 ? challenge1 : challenge2;

  return (
    <Container>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => { stopDetection(); navigate('/student'); }}>&larr; {t('common.back')}</Button>
      <Card className="shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <strong>{t('faceAttendance.title')}</strong>
            <Badge bg={challengePhase === 1 ? 'primary' : 'success'}>{t('faceAttendance.challenge', { num: challengePhase })}</Badge>
          </div>
        </Card.Header>
        <Card.Body className="text-center">
          {error && <Alert variant="danger">{error}</Alert>}
          {loadingChallenge ? <Spinner animation="border" className="mb-3" /> : currentChallenge && (
            <Alert variant={detected ? 'success' : 'info'} className="mb-3">
              {detected ? <strong>{statusText || t('faceAttendance.detected')}</strong> : (
                <>
                  <strong>{t('faceAttendance.challenge', { num: challengePhase })}:</strong> {t(`challenges.${currentChallenge.id}`, currentChallenge.instruction)}
                  {challengePhase === 2 && <div className="small text-danger mt-1">{t('faceAttendance.quicklyMsg')}</div>}
                </>
              )}
            </Alert>
          )}
          {loading && <Alert variant="warning" className="mb-3"><Spinner size="sm" className="me-2" />{t('faceAttendance.verifying')}</Alert>}
          <div style={{ position: 'relative' }}>
            <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="rounded mb-3" style={{ width: '100%', maxWidth: '400px' }} videoConstraints={{ facingMode: 'user' }} onUserMediaError={() => setError(t('faceAttendance.cameraError'))} mirrored={true} />
            {!detected && !loading && (
              <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                {t('faceAttendance.detecting')}
              </div>
            )}
            {detected && statusText && (
              <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(34,197,94,0.8)', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                {statusText}
              </div>
            )}
          </div>
          <p className="text-muted small">{t('faceAttendance.complete')}<br /><small>{t('faceAttendance.timeLimit')}</small></p>
        </Card.Body>
      </Card>
      <SecurityModal modalType={activeModal} onClose={handleCloseModal} />
    </Container>
  );
};

export default FaceAttendance;