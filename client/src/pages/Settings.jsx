import { useState, useEffect } from 'react';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Failed to load settings');
        const data = await res.json();
        setEmail(data.notification_email || data.notificationEmail || '');
        setSmtpHost(data.smtp_host || data.smtpHost || '');
        setSmtpPort(data.smtp_port || data.smtpPort || '');
        setSmtpUser(data.smtp_user || data.smtpUser || '');
        setSmtpPass(data.smtp_pass || data.smtpPass || '');
      } catch {
        // Settings may not exist yet - that's okay
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_email: email,
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUser,
          smtp_pass: smtpPass,
        }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Notifications */}
        <section className="bg-navy-800 rounded-xl p-6 border border-navy-700">
          <h2 className="text-lg font-semibold text-white mb-4">
            Notifications
          </h2>
          <div>
            <label className="label">Notification Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              You'll receive email alerts when high-confidence matches are found.
            </p>
          </div>
        </section>

        {/* SMTP */}
        <section className="bg-navy-800 rounded-xl p-6 border border-navy-700">
          <h2 className="text-lg font-semibold text-white mb-1">
            SMTP Configuration
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Optional for MVP. Configure a mail server to enable email notifications.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">SMTP Host</label>
              <input
                type="text"
                className="input-field"
                placeholder="smtp.gmail.com"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
              />
            </div>
            <div>
              <label className="label">SMTP Port</label>
              <input
                type="text"
                className="input-field"
                placeholder="587"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
              />
            </div>
            <div>
              <label className="label">SMTP User</label>
              <input
                type="text"
                className="input-field"
                placeholder="your@email.com"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
              />
            </div>
            <div>
              <label className="label">SMTP Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="App password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* eBay API info */}
        <section className="bg-navy-800 rounded-xl p-6 border border-navy-700">
          <h2 className="text-lg font-semibold text-white mb-2">
            eBay API Key
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            The eBay API key is configured on the server via the{' '}
            <code className="text-amber-500 bg-navy-900 px-1.5 py-0.5 rounded text-xs font-mono">
              .env
            </code>{' '}
            file. Set the{' '}
            <code className="text-amber-500 bg-navy-900 px-1.5 py-0.5 rounded text-xs font-mono">
              EBAY_APP_ID
            </code>{' '}
            variable to your eBay Production API key. You can obtain one from the{' '}
            <a
              href="https://developer.ebay.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              eBay Developer Portal
            </a>.
          </p>
        </section>

        {/* Error / Success */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}
        {saved && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-green-400 text-sm">
            Settings saved successfully.
          </div>
        )}

        {/* Save */}
        <button
          type="submit"
          disabled={saving}
          className="btn-amber flex items-center gap-2 px-6 py-3 disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-navy-900" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </form>
    </div>
  );
}
