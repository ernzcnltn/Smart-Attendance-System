import React, { useRef, useState, useEffect } from 'react';
import { Container, Card, Alert, Spinner, ProgressBar, Badge, Modal, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Webcam from 'react-webcam';
import api from '../../services/api';
import { checkChallenge } from '../../services/faceService';
import { useAuth } from '../../context/AuthContext';

const TOTAL_STEPS = 3;
const LIVENESS_FRAMES = 3;
const LIVENESS_INTERVAL = 500;

const SecurityModal = ({ modalType, onClose }) => {
  const { t } = useTranslation();
  if (!modalType) return null;

  const MODALS = {
    spoof: { title: t('faceAttendance.modals.spoof.title'), iconClass: 'bi bi-shield-x', heading: t('faceAttendance.modals.spoof.heading'), body: t('faceAttendance.modals.spoof.body'), tips: t('faceAttendance.modals.spoof.tips', { returnObjects: true }), color: '#dc2626' },
    multiple_faces: { title: t('faceAttendance.modals.multiple_faces.title'), iconClass: 'bi bi-people-fill', heading: t('faceAttendance.modals.multiple_faces.heading'), body: t('faceAttendance.modals.multiple_faces.body'), tips: t('faceAttendance.modals.multiple_faces.tips', { returnObjects: true }), color: '#dc2626' },
    duplicate: { title: t('faceAttendance.modals.mismatch.title'), iconClass: 'bi bi-exclamation-triangle-fill', heading: t('faceAttendance.modals.mismatch.heading'), body: t('faceAttendance.modals.mismatch.body'), tips: t('faceAttendance.modals.mismatch.tips', { returnObjects: true }), color: '#dc2626' },
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

const FaceRegister = ({ onComplete }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  const [activeModal, setActiveModal] = useState(null);
  const [livenessStatus, setLivenessStatus] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => { fetchChallenge(0); return () => stopDetection(); }, []);
  useEffect(() => { if (challenge && !detected && !loading) startDetection(); return () => stopDetection(); }, [challenge]);

  const fetchChallenge = async (step) => {
    setLoadingChallenge(true); setDetected(false); setError(''); setLivenessStatus(''); stopDetection();
    try {
      const response = await api.get(`/face/challenge?type=registration&step=${step}`);
      setChallenge(response.data.data.challenge);
    } catch { setError('Failed to load challenge. Please refresh.'); }
    finally { setLoadingChallenge(false); }
  };

  const startDetection = () => {
    stopDetection();
    intervalRef.current = setInterval(async () => {
      if (!webcamRef.current || capturing) return;
      try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc || !challenge) return;
        const response = await checkChallenge(imageSrc, challenge.id);
        if (response.multiple_faces) { stopDetection(); setActiveModal('multiple_faces'); return; }
        if (response.spoof) { stopDetection(); setActiveModal('spoof'); return; }
        if (response.detected) {
          stopDetection(); setDetected(true); setCapturing(true);
          setLivenessStatus(t('faceRegister.livenessCheck'));
          const livenessFrames = [];
          for (let i = 0; i < LIVENESS_FRAMES; i++) {
            await new Promise(r => setTimeout(r, LIVENESS_INTERVAL));
            const frame = webcamRef.current?.getScreenshot();
            if (frame) { livenessFrames.push(frame); setLivenessStatus(`${t('faceRegister.livenessCheck')} ${i + 1}/${LIVENESS_FRAMES}`); }
          }
          setLivenessStatus(t('faceRegister.detected'));
          await handleAutoRegister(imageSrc, livenessFrames);
          setCapturing(false);
        }
      } catch {}
    }, 1500);
  };

  const stopDetection = () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };

  const handleAutoRegister = async (imageSrc, livenessFrames) => {
    setLoading(true); setError('');
    try {
      const response = await api.post('/face/register', { image: imageSrc, challenge_id: challenge.id, step: currentStep, liveness_frames: livenessFrames });
      const { is_complete, next_step } = response.data.data;
      if (is_complete) {
        setSuccess(t('faceRegister.success')); setLivenessStatus('');
        await checkFaceStatus();
        setTimeout(() => { if (onComplete) onComplete(); else navigate('/student'); }, 3000);
      } else {
        setSuccess(`Step ${currentStep + 1} completed!`); setLivenessStatus('');
        setTimeout(() => { setSuccess(''); setCurrentStep(next_step); fetchChallenge(next_step); }, 1000);
      }
    } catch (err) {
      const data = err.response?.data;
      const message = data?.message || 'Failed to register.';
      const msg = message.toLowerCase();
      if (data?.duplicate_face || msg.includes('another account')) { stopDetection(); setActiveModal('duplicate'); }
      else if (data?.liveness_failed || msg.includes('spoof') || msg.includes('screen') || msg.includes('photo')) { stopDetection(); setActiveModal('spoof'); }
      else if (msg.includes('multiple faces')) { stopDetection(); setActiveModal('multiple_faces'); }
      else { setError(message); setDetected(false); setLivenessStatus(''); startDetection(); }
    } finally { setLoading(false); }
  };

  const handleCloseModal = async () => { setActiveModal(null); setDetected(false); setCapturing(false); setLivenessStatus(''); await fetchChallenge(currentStep); };

  return (
    <Container className="mt-4">
      <Card className="shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <strong>{t('faceRegister.title')}</strong>
            <Badge bg="primary">{t('faceRegister.step', { current: currentStep + 1, total: TOTAL_STEPS })}</Badge>
          </div>
        </Card.Header>
        <Card.Body className="text-center">
          <ProgressBar now={(currentStep / TOTAL_STEPS) * 100} className="mb-3" variant="primary" />
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          {loadingChallenge ? <Spinner animation="border" className="mb-3" /> : challenge && (
            <Alert variant={detected ? 'success' : 'info'} className="mb-3">
              {detected ? <strong>{livenessStatus || t('faceRegister.detected')}</strong>
                : <><strong>{t('faceRegister.challenge', { step: currentStep + 1 })}</strong> {t(`challenges.${challenge.id}`, challenge.instruction)}</>}
            </Alert>
          )}
          {loading && <Alert variant="warning" className="mb-3"><Spinner size="sm" className="me-2" />{t('faceRegister.saving', { step: currentStep + 1 })}</Alert>}
          <div style={{ position: 'relative' }}>
            <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="rounded mb-3" style={{ width: '100%', maxWidth: '400px' }} videoConstraints={{ facingMode: 'user' }} onUserMediaError={() => setError(t('faceRegister.cameraError'))} mirrored={true} />
            {!detected && !loading && (
              <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                {t('faceRegister.detecting')}
              </div>
            )}
            {detected && livenessStatus && (
              <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(34,197,94,0.8)', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                {livenessStatus}
              </div>
            )}
          </div>
          <p className="text-muted small">{t('faceRegister.instruction')}<br /><small>{t('faceRegister.livenessNote')}</small></p>
        </Card.Body>
      </Card>
      <SecurityModal modalType={activeModal} onClose={handleCloseModal} />
    </Container>
  );
};

export default FaceRegister;