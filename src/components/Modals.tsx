import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  KeyRound,
  Copy,
  Trash2,
  CalendarClock,
  Palette,
  Sun,
  Moon,
  LogOut,
  RotateCcw,
} from 'lucide-react';
import {
  ApiToken,
  Job,
  MediaFileItem,
  ScheduledJob,
  ThemeColors,
  ToastMessage,
  UserAccount,
} from '../types';

export const THEME_PRESETS: Record<string, { label: string; colors: ThemeColors; isLight?: boolean }> = {
  default: {
    label: 'Default Dark',
    colors: { bg: '#0c0e13', sidebar: '#11141b', card: '#161a23', border: '#252b38', text: '#edf1f7', accent: '#5b7cfa' },
  },
  light: {
    label: 'Light Mode',
    isLight: true,
    colors: { bg: '#f5f6f8', sidebar: '#eceef2', card: '#ffffff', border: '#d8dde6', text: '#111827', accent: '#3b5bdb' },
  },
  midnight: {
    label: 'Midnight Blue',
    colors: { bg: '#0a1128', sidebar: '#070c1c', card: '#121e42', border: '#1e2d5a', text: '#e0e7ff', accent: '#4f46e5' },
  },
  forest: {
    label: 'Forest Slate',
    colors: { bg: '#0b1a12', sidebar: '#06120c', card: '#122b1e', border: '#1e3f2c', text: '#d1fae5', accent: '#10b981' },
  },
  sunset: {
    label: 'Amber Studio',
    colors: { bg: '#16100c', sidebar: '#100b08', card: '#211812', border: '#3a2a1e', text: '#f5ebe0', accent: '#d97706' },
  },
  crimson: {
    label: 'Crimson Noir',
    colors: { bg: '#120b0e', sidebar: '#0b0608', card: '#1d1117', border: '#361f29', text: '#f9e6ed', accent: '#e11d48' },
  },
  nordic: {
    label: 'Nordic Slate',
    isLight: true,
    colors: { bg: '#eef2f6', sidebar: '#e2e8f0', card: '#f8fafc', border: '#cbd5e1', text: '#0f172a', accent: '#0284c7' },
  },
};

export const ToastContainer: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-xs shadow-lg"
          style={{
            backgroundColor: 'var(--mg-card)',
            borderColor: 'var(--mg-border)',
            color: 'var(--mg-text)',
          }}
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : t.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          ) : (
            <Info className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-accent)' }} />
          )}
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="opacity-70 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ open, title, message, onCancel, onConfirm }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div
        className="w-full max-w-md rounded-xl border p-5 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        <h3 className="font-display text-base font-semibold">{title}</h3>
        <p className="text-sm" style={{ color: 'var(--mg-muted)' }}>
          {message}
        </p>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border text-xs font-medium"
            style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export const JobLogModal: React.FC<{
  job: Job | null;
  onClose: () => void;
}> = ({ job, onClose }) => {
  if (!job) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div
        className="w-full max-w-2xl rounded-xl border p-5 flex flex-col gap-3 max-h-[85vh]"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold truncate">
              Execution Log — {job.title || job.job_id.slice(0, 8)}
            </h3>
            <p className="text-xs font-mono truncate" style={{ color: 'var(--mg-muted)' }}>
              {job.url}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md border" style={{ borderColor: 'var(--mg-border)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <pre
          className="flex-1 p-3.5 rounded-lg border text-xs font-mono overflow-auto whitespace-pre-wrap"
          style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
        >
          {job.log.join('\n')}
        </pre>
      </div>
    </div>
  );
};

export const QrModal: React.FC<{
  url: string | null;
  onClose: () => void;
}> = ({ url, onClose }) => {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 220, margin: 2 })
      .then(setDataUrl)
      .catch(() => setDataUrl(''));
  }, [url]);

  if (!url) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div
        className="w-full max-w-xs rounded-xl border p-5 flex flex-col items-center gap-4 text-center"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        <div className="w-full flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold">Scan to Open</h3>
          <button type="button" onClick={onClose} className="p-1 rounded border" style={{ borderColor: 'var(--mg-border)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {dataUrl && (
          <div className="p-2 bg-white rounded-lg">
            <img src={dataUrl} alt="QR Code" className="w-48 h-48 block" />
          </div>
        )}
        <p className="text-xs font-mono break-all line-clamp-2" style={{ color: 'var(--mg-muted)' }}>
          {url}
        </p>
      </div>
    </div>
  );
};

export const MetadataEditorModal: React.FC<{
  item: MediaFileItem | null;
  onClose: () => void;
  onSaved: () => void;
  onNotify: (type: 'info' | 'success' | 'error', msg: string) => void;
}> = ({ item, onClose, onSaved, onNotify }) => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setArtist(item.artist);
    setAlbum(item.album);
    setDate(item.date);
    setDescription(item.description);
    setCoverFile(null);
  }, [item]);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('file_path', item.path);
      fd.append('title', title);
      fd.append('artist', artist);
      fd.append('album', album);
      fd.append('date', date);
      fd.append('description', description);
      if (coverFile) fd.append('cover', coverFile);

      const res = await fetch('/api/metadata/editor/update', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error('Update failed');
      onNotify('success', 'Metadata updated.');
      onSaved();
      onClose();
    } catch {
      onNotify('error', 'Failed to update metadata.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl border p-5 flex flex-col gap-3 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold">Edit Metadata &amp; Cover</h3>
          <button type="button" onClick={onClose} className="p-1 rounded border" style={{ borderColor: 'var(--mg-border)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium">
          <span>Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium">
            <span>Artist / Uploader</span>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            <span>Album</span>
            <input
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium">
          <span>Date (YYYYMMDD)</span>
          <input
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm font-mono outline-none"
            style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium">
          <span>Description</span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm outline-none resize-y"
            style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium">
          <span>Cover Image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
            className="text-xs"
          />
        </label>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-xs font-medium"
            style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--mg-accent)' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const AccountModal: React.FC<{
  open: boolean;
  user: UserAccount | null;
  onClose: () => void;
  onUpdated: (user: UserAccount) => void;
  onLogout: () => void;
  onNotify: (type: 'info' | 'success' | 'error', msg: string) => void;
}> = ({ open, user, onClose, onUpdated, onLogout, onNotify }) => {
  const [tab, setTab] = useState<'profile' | 'security' | 'tokens' | 'register'>('profile');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [totpQr, setTotpQr] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [saving, setSaving] = useState(false);

  // API Tokens
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [tokenName, setTokenName] = useState('');
  const [tokenScope, setTokenScope] = useState<'read' | 'download' | 'admin'>('read');
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  // Self-service registration
  const [regUser, setRegUser] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPass2, setRegPass2] = useState('');

  const loadTokens = async () => {
    try {
      const res = await fetch('/api/tokens');
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!user || !open) return;
    setDisplayName(user.display_name);
    setEmail(user.email);
    setNewPassword('');
    setAvatarFile(null);
    setTotpQr('');
    setTotpCode('');
    setCreatedToken(null);
    if (user.role === 'admin') {
      void loadTokens();
    }
  }, [user, open]);

  if (!open || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('display_name', displayName);
      fd.append('email', email);
      if (newPassword) fd.append('new_password', newPassword);
      if (avatarFile) fd.append('avatar', avatarFile);
      const res = await fetch('/api/me/update', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        onNotify('error', data.error || 'Failed to update profile');
      } else {
        onUpdated(data.user);
        onNotify('success', 'Account updated.');
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStart2FA = async () => {
    const res = await fetch('/api/me/2fa/setup', { method: 'POST' });
    const data = await res.json();
    if (data.otpauth_uri) {
      const qr = await QRCode.toDataURL(data.otpauth_uri, { width: 180, margin: 2 });
      setTotpQr(qr);
    }
  };

  const handleEnable2FA = async () => {
    const res = await fetch('/api/me/2fa/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: totpCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify('error', data.error || 'Invalid verification code');
      return;
    }
    onUpdated({ ...user, totp_enabled: true });
    setTotpQr('');
    onNotify('success', 'Two-factor authentication enabled.');
  };

  const handleDisable2FA = async () => {
    await fetch('/api/me/2fa/disable', { method: 'POST' });
    onUpdated({ ...user, totp_enabled: false });
    onNotify('info', 'Two-factor authentication disabled.');
  };

  const handleCreateToken = async () => {
    if (!tokenName.trim()) return;
    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tokenName.trim(), scope: tokenScope }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify('error', data.error || 'Could not create token');
      return;
    }
    setCreatedToken(data.token);
    setTokenName('');
    void loadTokens();
    onNotify('success', 'API token generated.');
  };

  const handleRevokeToken = async (id: number) => {
    await fetch(`/api/tokens/${id}/revoke`, { method: 'POST' });
    void loadTokens();
    onNotify('info', 'Token revoked.');
  };

  const handleDeleteToken = async (id: number) => {
    await fetch(`/api/tokens/${id}`, { method: 'DELETE' });
    void loadTokens();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: regUser, password: regPass, password2: regPass2 }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify('error', data.error || 'Registration failed');
      return;
    }
    onUpdated(data.user);
    setRegUser('');
    setRegPass('');
    setRegPass2('');
    onNotify('success', `Registered and signed in as ${data.user.username}.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg rounded-xl border p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold">Account Settings</h3>
            <p className="text-xs truncate" style={{ color: 'var(--mg-muted)' }}>
              Signed in as <span className="font-mono">{user.username}</span> ({user.role})
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium text-red-400 border-red-500/40"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded border" style={{ borderColor: 'var(--mg-border)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b pb-2" style={{ borderColor: 'var(--mg-border)' }}>
          <button
            type="button"
            onClick={() => setTab('profile')}
            className="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0"
            style={{
              backgroundColor: tab === 'profile' ? 'var(--mg-accent)' : 'transparent',
              color: tab === 'profile' ? '#fff' : 'var(--mg-muted)',
            }}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setTab('security')}
            className="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0"
            style={{
              backgroundColor: tab === 'security' ? 'var(--mg-accent)' : 'transparent',
              color: tab === 'security' ? '#fff' : 'var(--mg-muted)',
            }}
          >
            Security &amp; 2FA
          </button>
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => setTab('tokens')}
              className="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0"
              style={{
                backgroundColor: tab === 'tokens' ? 'var(--mg-accent)' : 'transparent',
                color: tab === 'tokens' ? '#fff' : 'var(--mg-muted)',
              }}
            >
              API Tokens
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('register')}
            className="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0"
            style={{
              backgroundColor: tab === 'register' ? 'var(--mg-accent)' : 'transparent',
              color: tab === 'register' ? '#fff' : 'var(--mg-muted)',
            }}
          >
            Register User
          </button>
        </div>

        {tab === 'tokens' && user.role === 'admin' ? (
          <div className="flex flex-col gap-4">
            <p className="text-xs" style={{ color: 'var(--mg-muted)' }}>
              Create scoped API tokens for external scripts, Home Assistant, or PWA shortcuts. Tokens are shown once upon creation.
            </p>

            {createdToken && (
              <div className="p-3 rounded-lg border flex items-center justify-between gap-2" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-accent)' }}>
                <code className="text-xs font-mono break-all text-emerald-400">{createdToken}</code>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(createdToken);
                    onNotify('success', 'Copied API token.');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs whitespace-nowrap shrink-0"
                  style={{ borderColor: 'var(--mg-border)' }}
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="Token name (e.g. Home Assistant)"
                className="flex-1 px-3 py-2 rounded-lg border text-xs outline-none"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              />
              <select
                value={tokenScope}
                onChange={(e) => setTokenScope(e.target.value as 'read' | 'download' | 'admin')}
                className="px-3 py-2 rounded-lg border text-xs outline-none"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              >
                <option value="read">read</option>
                <option value="download">download</option>
                <option value="admin">admin</option>
              </select>
              <button
                type="button"
                onClick={handleCreateToken}
                className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
                style={{ backgroundColor: 'var(--mg-accent)' }}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Create</span>
              </button>
            </div>

            <div className="divide-y rounded-lg border max-h-48 overflow-y-auto" style={{ borderColor: 'var(--mg-border)' }}>
              {tokens.length === 0 ? (
                <div className="p-4 text-center text-xs" style={{ color: 'var(--mg-muted)' }}>
                  No API tokens generated yet.
                </div>
              ) : (
                tokens.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 p-2.5 text-xs" style={{ borderColor: 'var(--mg-border)' }}>
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {t.name}{' '}
                        <span className="font-mono" style={{ color: 'var(--mg-muted)' }}>
                          ({t.token_prefix}…)
                        </span>
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--mg-muted)' }}>
                        Scope: {t.scope} · {t.revoked ? 'Revoked' : 'Active'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!t.revoked && (
                        <button
                          type="button"
                          onClick={() => handleRevokeToken(t.id)}
                          className="px-2 py-1 rounded border text-[11px] text-amber-500 border-amber-500/40"
                        >
                          Revoke
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteToken(t.id)}
                        className="p-1 rounded border text-red-500 border-red-500/40"
                        aria-label="Delete token"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : tab === 'register' ? (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: 'var(--mg-muted)' }}>
              Create a new standard user account and switch to it immediately.
            </p>
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>Username (3–32 chars)</span>
              <input
                type="text"
                required
                minLength={3}
                maxLength={32}
                value={regUser}
                onChange={(e) => setRegUser(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>Password (min 8 chars)</span>
              <input
                type="password"
                required
                minLength={8}
                value={regPass}
                onChange={(e) => setRegPass(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>Confirm Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={regPass2}
                onChange={(e) => setRegPass2(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--mg-border)' }}>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border text-xs font-medium"
                style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: 'var(--mg-accent)' }}
              >
                Register Account
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            {tab === 'profile' ? (
              <>
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar}
                    alt={user.display_name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover border"
                    style={{ borderColor: 'var(--mg-border)' }}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    className="text-xs"
                  />
                </div>
                <label className="flex flex-col gap-1 text-xs font-medium">
                  <span>Display Name</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium">
                  <span>Email Address</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="flex flex-col gap-1 text-xs font-medium">
                  <span>New Password (optional, min 8 chars)</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                  />
                </label>

                <div className="pt-2 border-t flex flex-col gap-2.5" style={{ borderColor: 'var(--mg-border)' }}>
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <ShieldCheck className="w-4 h-4" style={{ color: 'var(--mg-accent)' }} />
                    <span>Two-Factor Authentication</span>
                  </div>
                  {user.totp_enabled ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-emerald-500">2FA is active on this account.</span>
                      <button
                        type="button"
                        onClick={handleDisable2FA}
                        className="px-3 py-1.5 rounded-md border text-xs text-red-500 border-red-500/40"
                      >
                        Disable 2FA
                      </button>
                    </div>
                  ) : totpQr ? (
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="p-2 bg-white rounded-lg">
                        <img src={totpQr} alt="2FA QR" className="w-36 h-36" />
                      </div>
                      <div className="flex gap-2 w-full">
                        <input
                          type="text"
                          maxLength={6}
                          value={totpCode}
                          onChange={(e) => setTotpCode(e.target.value)}
                          placeholder="6-digit code"
                          className="flex-1 px-3 py-1.5 rounded-lg border text-xs font-mono text-center outline-none"
                          style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                        />
                        <button
                          type="button"
                          onClick={handleEnable2FA}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                          style={{ backgroundColor: 'var(--mg-accent)' }}
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStart2FA}
                      className="px-3 py-2 rounded-lg border text-xs font-medium"
                      style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                    >
                      Set Up Authenticator 2FA
                    </button>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--mg-border)' }}>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border text-xs font-medium"
                style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: 'var(--mg-accent)' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export const ThemeModal: React.FC<{
  open: boolean;
  colors: ThemeColors;
  themeMode: 'dark' | 'light';
  onPreview: (colors: ThemeColors, isLight?: boolean) => void;
  onApply: (colors: ThemeColors, isLight?: boolean) => void;
  onClose: () => void;
}> = ({ open, colors, themeMode, onPreview, onApply, onClose }) => {
  const [draft, setDraft] = useState<ThemeColors>(colors);
  const [isLightDraft, setIsLightDraft] = useState(themeMode === 'light');
  const [presetKey, setPresetKey] = useState('custom');
  const [initialSnapshot, setInitialSnapshot] = useState<{ colors: ThemeColors; isLight: boolean } | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(colors);
      const light = themeMode === 'light';
      setIsLightDraft(light);
      setInitialSnapshot({ colors, isLight: light });
      const matched = Object.entries(THEME_PRESETS).find(
        ([, p]) => JSON.stringify(p.colors) === JSON.stringify(colors)
      );
      setPresetKey(matched ? matched[0] : 'custom');
    }
  }, [open, colors, themeMode]);

  if (!open) return null;

  const updateDraft = (nextColors: ThemeColors, nextLight: boolean, nextPreset = 'custom') => {
    setDraft(nextColors);
    setIsLightDraft(nextLight);
    setPresetKey(nextPreset);
    onPreview(nextColors, nextLight);
  };

  const handleCancel = () => {
    if (initialSnapshot) {
      onPreview(initialSnapshot.colors, initialSnapshot.isLight);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div
        className="w-full max-w-xl rounded-xl border p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4" style={{ color: 'var(--mg-accent)' }} />
            <h3 className="font-display text-sm font-semibold">Theme Editor</h3>
          </div>
          <button type="button" onClick={handleCancel} className="p-1 rounded border" style={{ borderColor: 'var(--mg-border)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>Theme Presets</span>
            <div
              className="inline-flex rounded-lg border p-0.5"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}
            >
              <button
                type="button"
                onClick={() => updateDraft(draft, false, presetKey)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  backgroundColor: !isLightDraft ? 'var(--mg-accent)' : 'transparent',
                  color: !isLightDraft ? '#ffffff' : 'var(--mg-muted)',
                }}
              >
                <Moon className="w-3 h-3" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => updateDraft(draft, true, presetKey)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  backgroundColor: isLightDraft ? 'var(--mg-accent)' : 'transparent',
                  color: isLightDraft ? '#ffffff' : 'var(--mg-muted)',
                }}
              >
                <Sun className="w-3 h-3" />
                <span>Light</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(THEME_PRESETS).map(([k, p]) => {
              const selected = presetKey === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => updateDraft(p.colors, Boolean(p.isLight), k)}
                  className="flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-colors"
                  style={{
                    backgroundColor: 'var(--mg-bg)',
                    borderColor: selected ? 'var(--mg-accent)' : 'var(--mg-border)',
                    color: 'var(--mg-text)',
                  }}
                >
                  <span className="inline-flex items-center -space-x-1 shrink-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: p.colors.bg }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: p.colors.accent }}
                    />
                  </span>
                  <span className="truncate font-medium">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          {(
            [
              ['bg', 'Background'],
              ['sidebar', 'Sidebar'],
              ['card', 'Surface / Card'],
              ['border', 'Border'],
              ['text', 'Primary Text'],
              ['accent', 'Accent Color'],
            ] as [keyof ThemeColors, string][]
          ).map(([field, label]) => (
            <div
              key={field}
              className="flex items-center justify-between gap-2 p-2.5 rounded-lg border"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}
            >
              <span className="font-medium truncate">{label}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="text"
                  value={draft[field]}
                  maxLength={7}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraft((prev) => {
                      const next = { ...prev, [field]: val };
                      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                        onPreview(next, isLightDraft);
                      }
                      return next;
                    });
                    setPresetKey('custom');
                  }}
                  aria-label={`${label} hex value`}
                  className="w-20 px-2 py-1 rounded border text-[11px] font-mono outline-none uppercase"
                  style={{
                    backgroundColor: 'var(--mg-card)',
                    borderColor: 'var(--mg-border)',
                    color: 'var(--mg-text)',
                  }}
                />
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(draft[field]) ? draft[field] : '#5b7cfa'}
                  onChange={(e) =>
                    updateDraft({ ...draft, [field]: e.target.value }, isLightDraft, 'custom')
                  }
                  aria-label={`${label} color picker`}
                  className="w-7 h-6 bg-transparent border-none cursor-pointer p-0"
                />
              </div>
            </div>
          ))}
        </div>

        <div
          className="rounded-lg border p-3 flex items-center justify-between gap-3"
          style={{
            backgroundColor: draft.bg,
            borderColor: draft.border,
            color: draft.text,
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-md border flex items-center justify-center shrink-0 text-xs font-bold"
              style={{ backgroundColor: draft.sidebar, borderColor: draft.border }}
            >
              MG
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">Live Preview Surface</div>
              <div className="text-[11px] opacity-75 truncate">
                Card contrast, border &amp; accent styling
              </div>
            </div>
          </div>
          <span
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-white shrink-0"
            style={{ backgroundColor: draft.accent }}
          >
            Primary Action
          </span>
        </div>

        <div className="flex justify-between gap-2 pt-2 border-t" style={{ borderColor: 'var(--mg-border)' }}>
          <button
            type="button"
            onClick={() => updateDraft(THEME_PRESETS.default.colors, false, 'default')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium"
            style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-muted)' }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-2 rounded-lg border text-xs font-medium"
              style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(draft, isLightDraft);
                onClose();
              }}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--mg-accent)' }}
            >
              Save Theme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ScheduleModal: React.FC<{
  open: boolean;
  prefillUrl?: string;
  onClose: () => void;
  onNotify: (type: 'info' | 'success' | 'error', msg: string) => void;
}> = ({ open, prefillUrl, onClose, onNotify }) => {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [scheduledTime, setScheduledTime] = useState('');
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [saving, setSaving] = useState(false);

  const loadJobs = async () => {
    try {
      const res = await fetch('/api/schedule');
      if (res.ok) setJobs(await res.json());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!open) return;
    if (prefillUrl) setUrl(prefillUrl);
    const future = new Date(Date.now() + 15 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    setScheduledTime(
      `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}T${pad(future.getHours())}:${pad(future.getMinutes())}`
    );
    void loadJobs();
  }, [open, prefillUrl]);

  if (!open) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !scheduledTime) return;
    setSaving(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), mode, scheduled_time: scheduledTime }),
      });
      if (!res.ok) {
        const err = await res.json();
        onNotify('error', err.error || 'Failed to schedule job');
        return;
      }
      setUrl('');
      onNotify('success', 'Download scheduled.');
      void loadJobs();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/schedule/${id}`, { method: 'DELETE' });
    void loadJobs();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg rounded-xl border p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            <span>Schedule Download</span>
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded border" style={{ borderColor: 'var(--mg-border)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium">
            <span>Media URL</span>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>Run At</span>
              <input
                type="datetime-local"
                required
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="px-3 py-2 rounded-lg border text-xs font-mono outline-none"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>Mode</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'video' | 'audio')}
                className="px-3 py-2 rounded-lg border text-xs outline-none"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              >
                <option value="video">Video</option>
                <option value="audio">Audio Only (MP3)</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--mg-accent)' }}
          >
            {saving ? 'Scheduling...' : 'Add Scheduled Job'}
          </button>
        </form>

        <div className="border-t pt-3 flex flex-col gap-2" style={{ borderColor: 'var(--mg-border)' }}>
          <div className="text-xs font-semibold" style={{ color: 'var(--mg-muted)' }}>
            Scheduled Jobs
          </div>
          {jobs.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--mg-muted)' }}>
              No scheduled downloads queued.
            </p>
          ) : (
            <div className="divide-y rounded-lg border max-h-48 overflow-y-auto" style={{ borderColor: 'var(--mg-border)' }}>
              {jobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between gap-2 p-2.5 text-xs" style={{ borderColor: 'var(--mg-border)' }}>
                  <div className="min-w-0">
                    <div className="truncate font-mono">{j.url}</div>
                    <div className="font-mono tabular-nums text-[11px]" style={{ color: 'var(--mg-muted)' }}>
                      {j.scheduled_time.replace('T', ' ')} · {j.mode} · {j.status}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(j.id)}
                    className="p-1 rounded border text-red-500 border-red-500/40 shrink-0"
                    aria-label="Delete scheduled job"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

