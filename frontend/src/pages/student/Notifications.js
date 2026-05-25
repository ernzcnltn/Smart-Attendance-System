import React, { useEffect, useState } from 'react';
import { Container, Card, Button, Badge, Alert, Spinner, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMyNotifications, markNotificationRead, deleteNotification } from '../../services/attendanceService';

const Notifications = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const localeMap = { tr: 'tr-TR', fr: 'fr-FR', ar: 'ar-SA', ru: 'ru-RU', en: 'en-GB' };
  const locale = localeMap[i18n.language] || 'en-GB';
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getMyNotifications();
      setNotifications(data);
    } catch (err) {
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {}
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map(n => markNotificationRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      setError('Failed to mark all as read.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {}
  };

  const handleDeleteAll = async () => {
    for (const n of notifications) {
      await handleDelete(n.id);
    }
    setShowConfirm(false);
  };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => navigate('/student')}>
        ← {t('common.back')}
      </Button>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>{t('notifications.title')}</h4>
        <div className="d-flex gap-2">
          {notifications.filter(n => !n.is_read).length > 0 && (
            <Button variant="outline-primary" size="sm" onClick={handleMarkAllRead}>
              Mark all as read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline-danger" size="sm" onClick={() => setShowConfirm(true)}>
              Delete all
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {notifications.length === 0 ? (
        <Card className="shadow-sm">
          <Card.Body className="text-center text-muted py-5">
            {t('notifications.noNotifications')}
          </Card.Body>
        </Card>
      ) : (
        notifications.map((n) => (
          <Card key={n.id} className={`shadow-sm mb-3 ${!n.is_read ? 'border-warning' : ''}`}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <p className="mb-1">{n.message}</p>
                  <span className="text-muted small">
                    {new Date(n.created_at).toLocaleString(locale)}
                  </span>
                </div>
                <div className="ms-3 d-flex align-items-center gap-2">
                  {!n.is_read ? (
                    <>
                      <Badge bg="danger" text="light">{t('notifications.new')}</Badge>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleMarkRead(n.id)}
                      >
                        {t('notifications.markRead')}
                      </Button>
                    </>
                  ) : (
                    <Badge bg="secondary">Read</Badge>
                  )}
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(n.id)}
                  >
                    {t('notifications.delete')}
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        ))
      )}

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete All Notifications</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete all notifications? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={handleDeleteAll}>{t('common.delete')}</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Notifications;