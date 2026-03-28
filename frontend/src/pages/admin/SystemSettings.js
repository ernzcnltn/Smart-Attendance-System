import React, { useEffect, useState } from 'react';
import { Container, Card, Button, Alert, Spinner, Form, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getSettings, updateSetting } from '../../services/settingsService';

const SystemSettings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [values, setValues] = useState({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
      const initial = {};
      Object.keys(data).forEach(key => {
        initial[key] = data[key].value;
      });
      setValues(initial);
    } catch (err) {
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key) => {
    setSaving({ ...saving, [key]: true });
    setError('');
    setSuccess('');
    try {
      await updateSetting(key, values[key]);
      setSuccess(`Setting "${key}" updated successfully.`);
      await fetchSettings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update setting.');
    } finally {
      setSaving({ ...saving, [key]: false });
    }
  };

  const getInputType = (key, value) => {
    if (key.includes('enabled')) return 'toggle';
    if (key.includes('threshold') || key.includes('minutes')) return 'number';
    return 'text';
  };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => navigate('/admin')}>
        ← Back
      </Button>

      <h4 className="mb-4">System Settings</h4>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {settings && Object.keys(settings).map((key) => {
        const setting = settings[key];
        const inputType = getInputType(key, setting.value);

        return (
          <Card key={key} className="shadow-sm mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>
                  <p className="text-muted small mb-0">{setting.description}</p>
                </div>
                <Badge bg="secondary" className="small">
                  Last updated: {new Date(setting.updated_at).toLocaleDateString('en-GB')}
                </Badge>
              </div>

              <div className="d-flex gap-2 align-items-center mt-3">
                {inputType === 'toggle' ? (
                  <Form.Select
                    value={values[key]}
                    onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                    style={{ maxWidth: '150px' }}
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </Form.Select>
                ) : (
                  <Form.Control
                    type={inputType}
                    value={values[key]}
                    onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                    style={{ maxWidth: '200px' }}
                    min={inputType === 'number' ? 0 : undefined}
                    max={key.includes('threshold') ? 100 : undefined}
                  />
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSave(key)}
                  disabled={saving[key]}
                >
                  {saving[key] ? <Spinner size="sm" /> : 'Save'}
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