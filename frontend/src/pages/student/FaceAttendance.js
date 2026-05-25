import React, { useRef, useState, useEffect, useCallback } from 'react';
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

  // UI state — sadece render için
  const [step, setStep] = useState('face');
  const [uiPhase, setUiPhase] = useState(1);
  const [uiChallenge, setUiChallenge] = useState(null);
  const [uiStatus, setUiStatus] = useState('detecting'); // 'detecting' | 'passed1' | 'verifying'
  const [loadingChallenge, setLoadingChallenge] = useState(true);
  const [error, setError] = useState('');
  const [activeModal, setActiveModal] = useState(null);

  // Tüm mantık ref'lerde
  const stateRef = useRef({
    phase: 1,
    challenge1: null,
    challenge2: null,
    challenge1Image: null,
    challenge1Time: null,
    liveness: [],
    busy: false,
    running: false,
  });
  const intervalRef = useRef(null);

  useEffect(() => {
    init();
    return () => stopInterval();
  }, []);

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const init = async () => {
    stopInterval();
    setLoadingChallenge(true);
    setError('');
    setUiPhase(1);
    setUiStatus('detecting');
    const s = stateRef.current;
    s.phase = 1;
    s.challenge1 = null;
    s.challenge2 = null;
    s.challenge1Image = null;
    s.challenge1Time = null;
    s.liveness = [];
    s.busy = false;
    s.running = false;
    try {
      const res = await api.get('/face/challenge?type=verification');
      s.challenge1 = res.data.data.challenge;
      setUiChallenge(res.data.data.challenge);
    } catch {
      setError('Failed to load challenge.');
      setLoadingChallenge(false);
      return;
    }
    setLoadingChallenge(false);
    startInterval();
  };

  const startInterval = () => {
    stopInterval();
    stateRef.current.running = true;
    intervalRef.current = setInterval(tick, 1500);
  };

  const tick = async () => {
    const s = stateRef.current;
    if (s.busy || !s.running) return;
    if (!webcamRef.current) return;

    const currentChallenge = s.phase === 1 ? s.challenge1 : s.challenge2;
    if (!currentChallenge) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    // Liveness frame topla
    if (s.liveness.length < 10) s.liveness.push(imageSrc);
    else { s.liveness.shift(); s.liveness.push(imageSrc); }

    s.busy = true;
    try {
      const res = await checkChallenge(imageSrc, currentChallenge.id, user?.uuid);

      if (res.multiple_faces) { stopInterval(); s.running = false; setActiveModal('multiple_faces'); return; }
      if (res.spoof) { stopInterval(); s.running = false; setActiveModal('spoof'); return; }
      if (res.wrong_person) { stopInterval(); s.running = false; setActiveModal('wrong_person'); return; }

      if (res.detected) {
        stopInterval();
        s.running = false;

        if (s.phase === 1) {
          // 1. challenge geçildi
          s.challenge1Image = imageSrc;
          s.challenge1Time = Date.now();
          setUiStatus('passed1');

          await new Promise(r => setTimeout(r, 800));

          // 2. challenge yükle
          try {
            const res2 = await api.get(`/face/challenge?type=verification&exclude=${currentChallenge.id}`);
            s.challenge2 = res2.data.data.challenge;
            s.phase = 2;
            setUiPhase(2);
            setUiChallenge(res2.data.data.challenge);
            setUiStatus('detecting');
            startInterval();
          } catch {
            setError('Failed to load second challenge.');
          }
        } else {
          // 2. challenge geçildi — verify
          setUiStatus('verifying');

          // Ek frame topla
          const extra = [];
          for (let i = 0; i < 3; i++) {
            await new Promise(r => setTimeout(r, 400));
            const f = webcamRef.current?.getScreenshot();
            if (f) extra.push(f);
          }

          const all = [...s.liveness, ...extra];
          const frames = all.length >= 6
            ? [all[0], all[Math.floor(all.length / 2)], all[all.length - 1]]
            : all.slice(-3);

          try {
            const verifyRes = await api.post('/face/verify', {
              challenges: [
                { id: s.challenge1.id, image: s.challenge1Image, timestamp: s.challenge1Time },
                { id: s.challenge2.id, image: imageSrc, timestamp: Date.now() }
              ],
              liveness_frames: frames
            });
            if (verifyRes.data.data.verified) {
              setStep('qr');
            } else {
              setActiveModal('mismatch');
            }
          } catch (err) {
            const msg = (err.response?.data?.message || '').toLowerCase();
            if (msg.includes('multiple')) setActiveModal('multiple_faces');
            else if (msg.includes('spoof') || msg.includes('screen') || msg.includes('liveness') || msg.includes('photo')) setActiveModal('spoof');
            else if (msg.includes('does not match')) setActiveModal('mismatch');
            else if (msg.includes('too slow')) setActiveModal('too_slow');
            else setActiveModal('mismatch');
          }
        }
      }
    } catch {}
    finally { s.busy = false; }
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    init();
  };

  if (step === 'qr') {
    return (
      <Container>
        <Alert variant="success" className="mb-3">{t('faceAttendance.faceVerified')}</Alert>
        <ScanQR expectedCourseUUID={courseUUID} />
      </Container>
    );
  }

  return (
    <Container>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => { stopInterval(); navigate('/student'); }}>
        &larr; {t('common.back')}
      </Button>
      <Card className="shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <strong>{t('faceAttendance.title')}</strong>
            <Badge bg={uiPhase === 1 ? 'primary' : 'success'}>{t('faceAttendance.challenge', { num: uiPhase })}</Badge>
          </div>
        </Card.Header>
        <Card.Body className="text-center">
          {error && <Alert variant="danger">{error}</Alert>}

          {loadingChallenge ? (
            <Spinner animation="border" className="mb-3" />
          ) : uiChallenge && (
            <Alert variant={uiStatus === 'passed1' ? 'success' : uiStatus === 'verifying' ? 'warning' : 'info'} className="mb-3">
              {uiStatus === 'passed1' && <strong>{t('faceAttendance.firstPassed')}</strong>}
              {uiStatus === 'verifying' && <><Spinner size="sm" className="me-2" /><strong>{t('faceAttendance.verifying')}</strong></>}
              {uiStatus === 'detecting' && (
                <>
                  <strong>{t('faceAttendance.challenge', { num: uiPhase })}:</strong>{' '}
                  {t(`challenges.${uiChallenge.id}`, uiChallenge.instruction)}
                  {uiPhase === 2 && <div className="small text-danger mt-1">{t('faceAttendance.quicklyMsg')}</div>}
                </>
              )}
            </Alert>
          )}

          <div style={{ position: 'relative' }}>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="rounded mb-3"
              style={{ width: '100%', maxWidth: '400px' }}
              videoConstraints={{ facingMode: 'user' }}
              onUserMediaError={() => setError(t('faceAttendance.cameraError'))}
              mirrored={true}
            />
            <div style={{
              position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
              background: uiStatus === 'passed1' ? 'rgba(34,197,94,0.8)' : 'rgba(0,0,0,0.6)',
              color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', whiteSpace: 'nowrap'
            }}>
              {uiStatus === 'detecting' && t('faceAttendance.detecting')}
              {uiStatus === 'passed1' && t('faceAttendance.firstPassed')}
              {uiStatus === 'verifying' && t('faceAttendance.verifying')}
            </div>
          </div>

          <p className="text-muted small">
            {t('faceAttendance.complete')}<br />
            <small>{t('faceAttendance.timeLimit')}</small>
          </p>
        </Card.Body>
      </Card>
      <SecurityModal modalType={activeModal} onClose={handleCloseModal} />
    </Container>
  );
};

export default FaceAttendance;