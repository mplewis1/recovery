import { Router } from 'express';
import { getSettings, updateSettings } from '../db/queries.js';

const router = Router();

/**
 * GET /api/settings
 * Get current application settings.
 */
router.get('/', (req, res) => {
  try {
    const settings = getSettings();
    // Mask SMTP password in response
    if (settings && settings.smtp_pass) {
      settings.smtp_pass = '********';
    }
    res.json(settings || {});
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/settings
 * Update application settings.
 */
router.put('/', (req, res) => {
  try {
    const { notification_email, smtp_host, smtp_port, smtp_user, smtp_pass } = req.body;

    // If smtp_pass is masked, fetch the real one to preserve it
    let effectiveSmtpPass = smtp_pass;
    if (smtp_pass === '********') {
      const current = getSettings();
      effectiveSmtpPass = current?.smtp_pass || null;
    }

    const settings = updateSettings({
      notification_email,
      smtp_host,
      smtp_port: smtp_port ? parseInt(smtp_port, 10) : null,
      smtp_user,
      smtp_pass: effectiveSmtpPass,
    });

    // Mask password in response
    if (settings && settings.smtp_pass) {
      settings.smtp_pass = '********';
    }

    res.json(settings);
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
