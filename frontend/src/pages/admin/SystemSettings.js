import React, { useEffect, useState, useRef } from 'react';
import { Container, Card, Button, Alert, Spinner, Form, Badge, Row, Col, Image } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getSettings, updateSetting } from '../../services/settingsService';
import { useBranding } from '../../context/BrandingContext';

const MEDIA_KEYS = ['school_logo', 'app_favicon'];

const SystemSettings = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const localeMap = { tr: 'tr-TR', fr: 'fr-FR', ar: 'ar-SA', ru: 'ru-RU', en: 'en-GB' };
  const locale = localeMap[i18n.language] || 'en-GB';
  const { refreshBranding } = useBranding();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [values, setValues] = useState({});
  const logoRef = useRef(null);
  const faviconRef = useRef(null);

  useEffect(() => { fetchSettings(); }, []);

  useEffect(() => {
    if (values['app_favicon']) {
      const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
      link.rel = 'icon';
      link.href = values['app_favicon'];
      document.head.appendChild(link);
    }
  }, [values['app_favicon']]);

  const fetchSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
      const initial = {};
      Object.keys(data).forEach(key => { initial[key] = data[key].value; });
      setValues(initial);
    } catch { setError('Failed to load settings.'); }
    finally { setLoading(false); }
  };

  const handleSave = async (key) => {
    setSaving({ ...saving, [key]: true });
    setError(''); setSuccess('');
    try {
      await updateSetting(key, values[key]);
      setSuccess('Setting updated successfully.');
      await fetchSettings();
      refreshBranding();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update setting.');
    } finally {
      setSaving({ ...saving, [key]: false });
    }
  };

  const handleImageUpload = (key, ref) => {
    const file = ref.current?.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { setError('Image must be smaller than 500KB.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => setValues({ ...values, [key]: e.target.result });
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = async (key) => {
    setSaving({ ...saving, [key]: true });
    try {
      await updateSetting(key, '');
      setValues({ ...values, [key]: '' });
      setSuccess('Image removed successfully.');
      await fetchSettings();
      refreshBranding();
    } catch { setError('Failed to remove image.'); }
    finally { setSaving({ ...saving, [key]: false }); }
  };

  const getInputType = (key) => {
    if (MEDIA_KEYS.includes(key)) return 'image';
    if (key.includes('enabled')) return 'toggle';
    if (key.includes('threshold') || key.includes('minutes')) return 'number';
    return 'text';
  };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  const regularSettings = settings ? Object.keys(settings).filter(k => !MEDIA_KEYS.includes(k)) : [];

  return (
    <Container>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => navigate('/admin')}>← {t('common.back')}</Button>
      <h4 className="mb-4">{t('admin.settings.title')}</h4>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* ─── Branding ─── */}
      <Card className="shadow-sm mb-4">
        <Card.Header><strong>{t('admin.settings.branding')}</strong></Card.Header>
        <Card.Body>
          <Row className="g-4">
            {/* School Logo */}
            <Col md={6}>
              <div className="mb-2">
                <strong>{t('admin.settings.schoolLogo')}</strong>
                <p className="text-muted small mb-2">{t('admin.settings.schoolLogoDesc')}</p>
                {values['school_logo'] ? (
                  <div className="mb-3">
                    <Image src={values['school_logo']} style={{ maxWidth: '120px', maxHeight: '80px', objectFit: 'contain', border: '1px solid #dee2e6', borderRadius: '8px', padding: '8px' }} />
                  </div>
                ) : (
                  <div className="mb-3 p-3 border rounded text-muted small text-center" style={{ maxWidth: '120px' }}>
                    {t('admin.settings.noLogo')}
                  </div>
                )}
                <Form.Control type="file" accept="image/png,image/jpeg,image/jpg" ref={logoRef} onChange={() => handleImageUpload('school_logo', logoRef)} className="mb-2" size="sm" />
                <div className="d-flex gap-2">
                  <Button variant="danger" size="sm" onClick={() => handleSave('school_logo')} disabled={saving['school_logo']}>
                    {saving['school_logo'] ? <Spinner size="sm" /> : t('admin.settings.saveLogo')}
                  </Button>
                  {values['school_logo'] && (
                    <Button variant="outline-secondary" size="sm" onClick={() => handleRemoveImage('school_logo')} disabled={saving['school_logo']}>
                      {t('admin.settings.remove')}
                    </Button>
                  )}
                </div>
              </div>
            </Col>

            {/* App Favicon */}
            <Col md={6}>
              <div className="mb-2">
                <strong>{t('admin.settings.appFavicon')}</strong>
                <p className="text-muted small mb-2">{t('admin.settings.appFaviconDesc')}</p>
                {values['app_favicon'] ? (
                  <div className="mb-3">
                    <Image src={values['app_favicon']} style={{ width: '48px', height: '48px', objectFit: 'contain', border: '1px solid #dee2e6', borderRadius: '8px', padding: '4px' }} />
                  </div>
                ) : (
                  <div className="mb-3 p-3 border rounded text-muted small text-center" style={{ maxWidth: '80px' }}>
                    {t('admin.settings.noFavicon')}
                  </div>
                )}
                <Form.Control type="file" accept="image/png,image/jpeg,image/x-icon" ref={faviconRef} onChange={() => handleImageUpload('app_favicon', faviconRef)} className="mb-2" size="sm" />
                <div className="d-flex gap-2">
                  <Button variant="danger" size="sm" onClick={() => handleSave('app_favicon')} disabled={saving['app_favicon']}>
                    {saving['app_favicon'] ? <Spinner size="sm" /> : t('admin.settings.saveFavicon')}
                  </Button>
                  {values['app_favicon'] && (
                    <Button variant="outline-secondary" size="sm" onClick={() => handleRemoveImage('app_favicon')} disabled={saving['app_favicon']}>
                      {t('admin.settings.remove')}
                    </Button>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ─── Regular Settings ─── */}
      {regularSettings.map(key => {
        const setting = settings[key];
        const inputType = getInputType(key);
        return (
          <Card key={key} className="shadow-sm mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <strong>{t(`admin.settingKeys.${key}`, key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}</strong>
                  <p className="text-muted small mb-0">{setting.description}</p>
                </div>
                <Badge bg="secondary" className="small">
                  {t('admin.settings.lastUpdated', { date: new Date(setting.updated_at).toLocaleDateString(locale) })}
                </Badge>
              </div>
              <div className="d-flex gap-2 align-items-center mt-3">
                {inputType === 'toggle' ? (
                  <Form.Select value={values[key]} onChange={e => setValues({ ...values, [key]: e.target.value })} style={{ maxWidth: '150px' }}>
                    <option value="true">{t('common.enabled')}</option>
                    <option value="false">{t('common.disabled')}</option>
                  </Form.Select>
                ) : (
                  <Form.Control
                    type={inputType}
                    value={values[key]}
                    onChange={e => setValues({ ...values, [key]: e.target.value })}
                    style={{ maxWidth: '200px' }}
                    min={inputType === 'number' ? 0 : undefined}
                    max={key.includes('threshold') ? 100 : undefined}
                  />
                )}
                <Button variant="danger" size="sm" onClick={() => handleSave(key)} disabled={saving[key]}>
                  {saving[key] ? <Spinner size="sm" /> : t('common.save')}
                </Button>
              </div>
            </Card.Body>
          </Card>
        );
      })}
    </Container>
  );
};

export default SystemSettings;