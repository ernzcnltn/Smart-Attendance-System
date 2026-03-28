const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/helpers');

const getSettings = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM system_settings ORDER BY id ASC');
    const settings = {};
    rows.forEach(row => {
      settings[row.setting_key] = {
        value: row.setting_value,
        description: row.description,
        updated_at: row.updated_at
      };
    });
    return successResponse(res, settings);
  } catch (error) {
    console.error('Get settings error:', error.message);
    return errorResponse(res, 'Failed to fetch settings.');
  }
};

const updateSetting = async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (!value) return errorResponse(res, 'Value is required.', 400);

  try {
    const [existing] = await pool.query('SELECT id FROM system_settings WHERE setting_key = ?', [key]);
    if (existing.length === 0) return errorResponse(res, 'Setting not found.', 404);

    await pool.query('UPDATE system_settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
    return successResponse(res, { key, value }, 'Setting updated successfully.');
  } catch (error) {
    console.error('Update setting error:', error.message);
    return errorResponse(res, 'Failed to update setting.');
  }
};

const getSettingByKey = async (key) => {
  const [rows] = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = ?', [key]);
  return rows.length > 0 ? rows[0].setting_value : null;
};

module.exports = { getSettings, updateSetting, getSettingByKey };