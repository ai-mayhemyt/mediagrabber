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
  ExternalLink,
  Download,
  Play,
  BookOpen,
  Bell,
  FolderOpen,
  Rss,
  Smartphone,
  UserPlus,
  UserCheck,
  Sliders,
  Server,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react';
import {
  ActiveView,
  ApiToken,
  Job,
  MediaFileItem,
  MediaGrabberSettings,
  MediaPreviewItem,
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
  initialTab?: 'profile' | 'security' | 'tokens' | 'register';
  onClose: () => void;
  onUpdated: (user: UserAccount) => void;
  onLogout: () => void;
  onNotify: (type: 'info' | 'success' | 'error', msg: string) => void;
}> = ({ open, user, initialTab = 'profile', onClose, onUpdated, onLogout, onNotify }) => {
  const [tab, setTab] = useState<'profile' | 'security' | 'tokens' | 'register'>(initialTab);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [totpQr, setTotpQr] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
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
    setTab(initialTab);
    setDisplayName(user.display_name);
    setEmail(user.email);
    setNewPassword('');
    setAvatarFile(null);
    setTotpQr('');
    setTotpUri('');
    setTotpSecret('');
    setTotpCode('');
    setCreatedToken(null);
    if (user.role === 'admin') {
      void loadTokens();
    }
  }, [user, open, initialTab]);

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
      setTotpUri(String(data.otpauth_uri));
      setTotpSecret(String(data.secret || ''));
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
    setTotpUri('');
    setTotpSecret('');
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
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-2 bg-white rounded-lg">
                        <img src={totpQr} alt="2FA QR" className="w-36 h-36" />
                      </div>

                      {totpUri && (
                        <div className="w-full flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={totpUri}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
                              style={{ backgroundColor: 'var(--mg-accent)' }}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open in Authenticator App</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                void navigator.clipboard.writeText(totpUri);
                                onNotify('success', 'Copied 2FA setup link.');
                              }}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
                              style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy 2FA Link</span>
                            </button>
                          </div>

                          {totpSecret && (
                            <div
                              className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs"
                              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}
                            >
                              <span className="truncate font-mono" style={{ color: 'var(--mg-muted)' }}>
                                Key: <strong style={{ color: 'var(--mg-text)' }}>{totpSecret}</strong>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  void navigator.clipboard.writeText(totpSecret);
                                  onNotify('success', 'Copied 2FA secret key.');
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-medium hover:underline shrink-0"
                                style={{ color: 'var(--mg-accent)' }}
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy Key</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

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

function formatPreviewBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let val = bytes;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export const MediaPlayerModal: React.FC<{
  media: MediaPreviewItem | null;
  onClose: () => void;
}> = ({ media, onClose }) => {
  if (!media) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div
        className="w-full max-w-2xl rounded-xl border p-5 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold flex items-center gap-2 truncate">
              <Play className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-accent)' }} />
              <span className="truncate">{media.filename}</span>
            </h3>
            <p className="text-xs font-mono tabular-nums mt-0.5" style={{ color: 'var(--mg-muted)' }}>
              {formatPreviewBytes(media.size_bytes)} · signed 1h stream
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={media.downloadUrl}
              download={media.filename}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
              style={{ backgroundColor: 'var(--mg-accent)' }}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save to Device</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border"
              style={{ borderColor: 'var(--mg-border)' }}
              aria-label="Close media preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          className="rounded-lg border overflow-hidden flex items-center justify-center p-2"
          style={{ backgroundColor: '#000000', borderColor: 'var(--mg-border)' }}
        >
          {media.isAudio ? (
            <div className="w-full p-4">
              <audio
                key={media.inlineUrl}
                src={media.inlineUrl}
                controls
                autoPlay
                className="w-full"
              />
            </div>
          ) : (
            <video
              key={media.inlineUrl}
              src={media.inlineUrl}
              controls
              playsInline
              autoPlay
              className="w-full max-h-[65vh] rounded"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const QuickStartModal: React.FC<{
  open: boolean;
  user: UserAccount | null;
  settings: MediaGrabberSettings | null;
  notificationsEnabled: boolean;
  onEnableNotifications: () => Promise<boolean>;
  onNavigate: (view: ActiveView) => void;
  onOpenAccountSecurity: () => void;
  onUserUpdated: (user: UserAccount) => void;
  onSettingsSaved: (settings: MediaGrabberSettings) => void;
  onNotify: (type: 'info' | 'success' | 'error', msg: string) => void;
  onFinish: (dontShowAgain: boolean) => void;
}> = ({
  open,
  user,
  settings,
  notificationsEnabled,
  onEnableNotifications,
  onNavigate,
  onOpenAccountSecurity,
  onUserUpdated,
  onSettingsSaved,
  onNotify,
  onFinish,
}) => {
  const isAdmin = !user || user.role === 'admin';
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const [existingUsers, setExistingUsers] = useState<UserAccount[]>([]);
  const [busy, setBusy] = useState(false);

  // Step 1: Account mode (preserve existing vs add new admin)
  const [accountAction, setAccountAction] = useState<'keep' | 'create'>('keep');
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminDisplay, setNewAdminDisplay] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminPass2, setNewAdminPass2] = useState('');
  const [switchToNewAdmin, setSwitchToNewAdmin] = useState(true);

  // Step 1: Existing account quick update & inline 2FA
  const [editDisplay, setEditDisplay] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [qsTotpQr, setQsTotpQr] = useState('');
  const [qsTotpUri, setQsTotpUri] = useState('');
  const [qsTotpSecret, setQsTotpSecret] = useState('');
  const [qsTotpCode, setQsTotpCode] = useState('');

  // Steps 2–4: Settings draft
  const [draft, setDraft] = useState<Partial<MediaGrabberSettings>>({});
  const [testingWebhook, setTestingWebhook] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setAccountAction(user ? 'keep' : 'create');
    setNewAdminUser('');
    setNewAdminDisplay('');
    setNewAdminEmail('');
    setNewAdminPass('');
    setNewAdminPass2('');
    setSwitchToNewAdmin(true);
    setEditDisplay(user?.display_name || '');
    setEditEmail(user?.email || '');
    setEditPassword('');
    setQsTotpQr('');
    setQsTotpUri('');
    setQsTotpSecret('');
    setQsTotpCode('');

    if (settings) {
      setDraft(settings);
    } else if (user) {
      fetch('/api/settings')
        .then((r) => (r.ok ? r.json() : null))
        .then((s) => {
          if (s) setDraft(s);
        })
        .catch(() => {});
    }

    if (user) {
      fetch('/api/users')
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => {
          if (Array.isArray(list)) setExistingUsers(list);
        })
        .catch(() => {});
    } else {
      setExistingUsers([]);
    }
  }, [open, user, settings]);

  if (!open) return null;

  const steps = isAdmin
    ? [
        { id: 'admin', label: 'Admin Account' },
        { id: 'libraries', label: 'Media Libraries' },
        { id: 'quality', label: 'Format & Cleanup' },
        { id: 'connections', label: 'Alerts & Sync' },
        { id: 'finish', label: 'Finish' },
      ]
    : [
        { id: 'account', label: 'Account & 2FA' },
        { id: 'finish', label: 'Alerts & Tips' },
      ];

  const updateDraft = <K extends keyof MediaGrabberSettings>(
    key: K,
    value: MediaGrabberSettings[K]
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleStartInline2FA = async () => {
    try {
      const res = await fetch('/api/me/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.otpauth_uri) {
        onNotify('error', data.error || 'Could not start 2FA setup.');
        return;
      }
      setQsTotpUri(String(data.otpauth_uri));
      setQsTotpSecret(String(data.secret || ''));
      const qr = await QRCode.toDataURL(data.otpauth_uri, { width: 156, margin: 2 });
      setQsTotpQr(qr);
    } catch {
      onNotify('error', 'Failed to initialize 2FA setup.');
    }
  };

  const handleVerifyInline2FA = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/me/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: qsTotpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify('error', data.error || 'Invalid 6-digit verification code.');
        return;
      }
      onUserUpdated({ ...user, totp_enabled: true });
      setQsTotpQr('');
      setQsTotpUri('');
      setQsTotpSecret('');
      setQsTotpCode('');
      onNotify('success', 'Two-factor authentication enabled.');
    } catch {
      onNotify('error', 'Failed to verify 2FA code.');
    }
  };

  const handleStep1Continue = async () => {
    setBusy(true);
    try {
      if (accountAction === 'create') {
        const res = await fetch('/api/quickstart/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: newAdminUser.trim(),
            display_name: newAdminDisplay.trim() || undefined,
            email: newAdminEmail.trim() || undefined,
            password: newAdminPass,
            password2: newAdminPass2,
            switch_session: switchToNewAdmin,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          onNotify('error', data.error || 'Failed to create admin account.');
          return;
        }
        if (Array.isArray(data.users)) {
          setExistingUsers(data.users);
        }
        if (data.user && (switchToNewAdmin || !user)) {
          onUserUpdated(data.user);
        }
        // Load settings now that an authenticated session is guaranteed
        fetch('/api/settings')
          .then((r) => (r.ok ? r.json() : null))
          .then((s) => {
            if (s) setDraft((prev) => ({ ...s, ...prev }));
          })
          .catch(() => {});

        onNotify(
          'success',
          `Created admin "${data.user?.username}" — ${data.preserved_count ?? 0} existing account(s) preserved.`
        );
        setStep(1);
        return;
      }

      // Keeping current user: save optional profile/password edits if changed
      if (user) {
        const changedProfile =
          editDisplay.trim() !== user.display_name ||
          editEmail.trim() !== user.email ||
          editPassword.length > 0;
        if (changedProfile) {
          const fd = new FormData();
          fd.append('display_name', editDisplay.trim() || user.display_name);
          fd.append('email', editEmail.trim());
          if (editPassword) fd.append('new_password', editPassword);
          const res = await fetch('/api/me/update', { method: 'POST', body: fd });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            onNotify('error', data.error || 'Failed to update account.');
            return;
          }
          if (data.user) onUserUpdated(data.user);
          setEditPassword('');
          onNotify('success', 'Account details saved.');
        }
      }
      setStep(1);
    } finally {
      setBusy(false);
    }
  };

  const savePartialSettings = async (patch: Partial<MediaGrabberSettings>, nextStep: number) => {
    setBusy(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotify('error', data.error || 'Failed to save settings.');
        return;
      }
      if (data.settings) {
        setDraft(data.settings);
        onSettingsSaved(data.settings);
      }
      setStep(nextStep);
    } finally {
      setBusy(false);
    }
  };

  const handleTestWizardWebhook = async () => {
    setTestingWebhook(true);
    try {
      const res = await fetch('/api/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: draft.webhook_url || '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotify('error', data.error || 'Webhook test failed.');
      } else {
        onNotify('success', data.message || 'Test webhook delivered.');
      }
    } finally {
      setTestingWebhook(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm outline-none';
  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--mg-bg)',
    borderColor: 'var(--mg-border)',
    color: 'var(--mg-text)',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div
        className="w-full max-w-2xl rounded-xl border p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--mg-border)' }}>
          <div>
            <h3 className="font-display text-base font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4" style={{ color: 'var(--mg-accent)' }} />
              <span>MediaGrabber Setup Wizard</span>
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--mg-muted)' }}>
              {isAdmin
                ? 'Set up your admin account, media library paths, quality defaults, and alerts — existing accounts are always preserved.'
                : 'Quick setup for your account security, 2FA, and browser alerts.'}
            </p>
          </div>
          {user && (
            <button
              type="button"
              onClick={() => onFinish(false)}
              className="p-1.5 rounded-lg border shrink-0"
              style={{ borderColor: 'var(--mg-border)' }}
              aria-label="Close Setup Wizard"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Jellyfin-style Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {steps.map((s, idx) => {
            const active = idx === step;
            const completed = idx < step;
            return (
              <button
                key={s.id}
                type="button"
                disabled={!user && idx > 0}
                onClick={() => {
                  if (user || idx === 0) setStep(idx);
                }}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-left text-xs font-medium transition-colors disabled:opacity-45"
                style={{
                  backgroundColor: active ? 'var(--mg-accent)' : 'var(--mg-bg)',
                  borderColor: active || completed ? 'var(--mg-accent)' : 'var(--mg-border)',
                  color: active ? '#ffffff' : completed ? 'var(--mg-text)' : 'var(--mg-muted)',
                }}
              >
                <span className="font-mono text-[11px] shrink-0">
                  {completed ? '✓' : `${idx + 1}.`}
                </span>
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* STEP 1: ADMIN ACCOUNT / USER ACCOUNT */}
        {step === 0 && (
          <div className="flex flex-col gap-3.5">
            {existingUsers.length > 0 && (
              <div
                className="p-3 rounded-lg border flex flex-col gap-1.5"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}
              >
                <div className="text-xs font-semibold flex items-center gap-1.5 text-emerald-400">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Existing Accounts Preserved ({existingUsers.length})</span>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--mg-muted)' }}>
                  Your existing accounts are safe and will never be deleted or overwritten:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {existingUsers.map((u) => (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono"
                      style={{
                        borderColor: user?.id === u.id ? 'var(--mg-accent)' : 'var(--mg-border)',
                        color: 'var(--mg-text)',
                      }}
                    >
                      @{u.username} ({u.role})
                      {user?.id === u.id ? ' · active' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isAdmin && (
              <div
                className="grid grid-cols-2 gap-1.5 p-1 rounded-lg border"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}
              >
                {user && (
                  <button
                    type="button"
                    onClick={() => setAccountAction('keep')}
                    className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium whitespace-nowrap"
                    style={{
                      backgroundColor: accountAction === 'keep' ? 'var(--mg-accent)' : 'transparent',
                      color: accountAction === 'keep' ? '#ffffff' : 'var(--mg-muted)',
                    }}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Keep @{user.username}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAccountAction('create')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium whitespace-nowrap ${
                    !user ? 'col-span-2' : ''
                  }`}
                  style={{
                    backgroundColor: accountAction === 'create' ? 'var(--mg-accent)' : 'transparent',
                    color: accountAction === 'create' ? '#ffffff' : 'var(--mg-muted)',
                  }}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create New Admin</span>
                </button>
              </div>
            )}

            {accountAction === 'create' && isAdmin ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs" style={{ color: 'var(--mg-muted)' }}>
                  Add an administrator account just like Jellyfin&apos;s initial user setup. Any existing accounts remain intact.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    <span>Admin Username (3–32 chars)</span>
                    <input
                      type="text"
                      value={newAdminUser}
                      onChange={(e) => setNewAdminUser(e.target.value)}
                      placeholder="e.g. media_admin"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    <span>Display Name (optional)</span>
                    <input
                      type="text"
                      value={newAdminDisplay}
                      onChange={(e) => setNewAdminDisplay(e.target.value)}
                      placeholder="Media Admin"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-xs font-medium">
                  <span>Email (optional)</span>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className={inputClass}
                    style={inputStyle}
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    <span>Password (min 8 chars)</span>
                    <input
                      type="password"
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    <span>Confirm Password</span>
                    <input
                      type="password"
                      value={newAdminPass2}
                      onChange={(e) => setNewAdminPass2(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </label>
                </div>
                {user && (
                  <label className="inline-flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--mg-muted)' }}>
                    <input
                      type="checkbox"
                      checked={switchToNewAdmin}
                      onChange={(e) => setSwitchToNewAdmin(e.target.checked)}
                      className="w-4 h-4 accent-[var(--mg-accent)]"
                    />
                    <span>Switch active session to this new admin account</span>
                  </label>
                )}
              </div>
            ) : (
              user && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 text-xs font-medium">
                      <span>Display Name</span>
                      <input
                        type="text"
                        value={editDisplay}
                        onChange={(e) => setEditDisplay(e.target.value)}
                        className={inputClass}
                        style={inputStyle}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium">
                      <span>Email Address</span>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className={inputClass}
                        style={inputStyle}
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-1 text-xs font-medium">
                    <span>Update Password (optional, leave blank to keep current)</span>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </label>

                  {/* Inline 2FA Setup with QR + Direct Link */}
                  <div
                    className="p-3 rounded-lg border flex flex-col gap-2.5"
                    style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <ShieldCheck className="w-4 h-4" style={{ color: 'var(--mg-accent)' }} />
                        <span>Two-Factor Authentication (2FA)</span>
                      </div>
                      {user.totp_enabled ? (
                        <span className="text-xs font-medium text-emerald-400">Active</span>
                      ) : (
                        !qsTotpUri && (
                          <button
                            type="button"
                            onClick={() => void handleStartInline2FA()}
                            className="px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap"
                            style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                          >
                            Set Up 2FA Link / QR
                          </button>
                        )
                      )}
                    </div>

                    {user.totp_enabled ? (
                      <p className="text-xs" style={{ color: 'var(--mg-muted)' }}>
                        2FA is active on @{user.username}. You can manage or reset it anytime in Account Settings.
                      </p>
                    ) : qsTotpUri ? (
                      <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                        {qsTotpQr && (
                          <div className="p-1.5 bg-white rounded-lg shrink-0">
                            <img src={qsTotpQr} alt="2FA QR Code" className="w-28 h-28" />
                          </div>
                        )}
                        <div className="flex-1 w-full flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={qsTotpUri}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
                              style={{ backgroundColor: 'var(--mg-accent)' }}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open in Authenticator App</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                void navigator.clipboard.writeText(qsTotpUri);
                                onNotify('success', 'Copied 2FA setup link.');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
                              style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy 2FA Link</span>
                            </button>
                          </div>
                          {qsTotpSecret && (
                            <div className="flex items-center justify-between gap-2 text-[11px] font-mono" style={{ color: 'var(--mg-muted)' }}>
                              <span className="truncate">Key: {qsTotpSecret}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  void navigator.clipboard.writeText(qsTotpSecret);
                                  onNotify('success', 'Copied 2FA key.');
                                }}
                                className="hover:underline shrink-0"
                                style={{ color: 'var(--mg-accent)' }}
                              >
                                Copy Key
                              </button>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              value={qsTotpCode}
                              onChange={(e) => setQsTotpCode(e.target.value)}
                              placeholder="6-digit code"
                              className="flex-1 px-3 py-1.5 rounded-lg border text-xs font-mono text-center outline-none"
                              style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                            />
                            <button
                              type="button"
                              onClick={() => void handleVerifyInline2FA()}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap"
                              style={{ backgroundColor: 'var(--mg-accent)' }}
                            >
                              Verify
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--mg-muted)' }}>
                        Generate a QR code or direct authenticator link (<code className="font-mono">otpauth://</code>) to secure your account on iPad or desktop.
                      </p>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* STEP 2: MEDIA LIBRARIES (ADMIN) */}
        {isAdmin && step === 1 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <FolderOpen className="w-4 h-4" style={{ color: 'var(--mg-accent)' }} />
              <span>Configure Media Library Folders</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--mg-muted)' }}>
              Point each download engine to your server storage folders. Directories are created automatically if needed.
            </p>
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>YouTube Video Base Path</span>
              <input
                type="text"
                value={draft.yt_base_path || ''}
                onChange={(e) => updateDraft('yt_base_path', e.target.value)}
                placeholder="/media/YouTube"
                className={`${inputClass} font-mono`}
                style={inputStyle}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>Music Library Path (YT Music &amp; Spotify)</span>
              <input
                type="text"
                value={draft.music_base_path || ''}
                onChange={(e) => updateDraft('music_base_path', e.target.value)}
                placeholder="/opt/navidrome/music/navidrome/music"
                className={`${inputClass} font-mono`}
                style={inputStyle}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>Gallery Base Path</span>
              <input
                type="text"
                value={draft.gallery_base_path || ''}
                onChange={(e) => updateDraft('gallery_base_path', e.target.value)}
                placeholder="/media/Gallery"
                className={`${inputClass} font-mono`}
                style={inputStyle}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>Folder Organization</span>
              <select
                value={draft.folder_structure || 'default'}
                onChange={(e) => updateDraft('folder_structure', e.target.value as 'default' | 'flat')}
                className={inputClass}
                style={inputStyle}
              >
                <option value="default">Creator / Year Subfolders (Recommended)</option>
                <option value="flat">Single Flat Folder</option>
              </select>
            </label>
          </div>
        )}

        {/* STEP 3: FORMAT & STALE CLEANUP (ADMIN) */}
        {isAdmin && step === 2 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Sliders className="w-4 h-4" style={{ color: 'var(--mg-accent)' }} />
              <span>Preferred Quality &amp; Auto-Cleanup</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span>Max Video Resolution</span>
                <select
                  value={draft.video_res || '1080'}
                  onChange={(e) => updateDraft('video_res', e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                >
                  <option value="2160">4K (2160p)</option>
                  <option value="1440">1440p</option>
                  <option value="1080">1080p</option>
                  <option value="720">720p</option>
                  <option value="480">480p</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span>Video Container</span>
                <select
                  value={draft.container || 'mp4'}
                  onChange={(e) => updateDraft('container', e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                >
                  <option value="mp4">MP4 (Best iOS/iPad compatibility)</option>
                  <option value="mkv">MKV</option>
                  <option value="webm">WebM</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span>Audio Format</span>
                <select
                  value={draft.audio_format || 'mp3'}
                  onChange={(e) => updateDraft('audio_format', e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                >
                  <option value="mp3">MP3</option>
                  <option value="flac">FLAC (Lossless)</option>
                  <option value="m4a">M4A (AAC)</option>
                  <option value="opus">Opus</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span>Audio Bitrate</span>
                <select
                  value={draft.audio_bitrate || '320'}
                  onChange={(e) => updateDraft('audio_bitrate', e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                >
                  <option value="320">320 kbps</option>
                  <option value="256">256 kbps</option>
                  <option value="192">192 kbps</option>
                  <option value="128">128 kbps</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>Stale Download Timeout (minutes, 5–1440)</span>
              <input
                type="number"
                min={5}
                max={1440}
                value={draft.stale_timeout_minutes ?? 120}
                onChange={(e) => updateDraft('stale_timeout_minutes', Number(e.target.value) || 120)}
                className={`${inputClass} font-mono`}
                style={inputStyle}
              />
            </label>
            <label className="inline-flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--mg-muted)' }}>
              <input
                type="checkbox"
                checked={Boolean(draft.generate_lrc)}
                onChange={(e) => updateDraft('generate_lrc', e.target.checked)}
                className="w-4 h-4 accent-[var(--mg-accent)]"
              />
              <span>Generate synced `.lrc` lyrics files alongside music downloads</span>
            </label>
          </div>
        )}

        {/* STEP 4: ALERTS, WEBHOOKS & MEDIA SERVER SYNC (ADMIN) */}
        {isAdmin && step === 3 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Server className="w-4 h-4" style={{ color: 'var(--mg-accent)' }} />
              <span>Alerts, Webhooks &amp; Media Servers</span>
            </div>
            <div
              className="p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3"
              style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}
            >
              <div>
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" style={{ color: 'var(--mg-accent)' }} />
                  <span>Browser / PWA Push Notifications</span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--mg-muted)' }}>
                  Receive download completion alerts directly on this device.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void onEnableNotifications()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
                style={{ backgroundColor: notificationsEnabled ? '#16a34a' : 'var(--mg-accent)' }}
              >
                {notificationsEnabled ? 'Alerts Enabled' : 'Enable Alerts'}
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">
                Webhook URL (Discord, Slack, ntfy, or Apple Shortcut — optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={draft.webhook_url || ''}
                  onChange={(e) => updateDraft('webhook_url', e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className={`${inputClass} flex-1 font-mono`}
                  style={inputStyle}
                />
                <button
                  type="button"
                  disabled={testingWebhook}
                  onClick={() => void handleTestWizardWebhook()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
                  style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testingWebhook ? 'Testing...' : 'Test'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span>Jellyfin URL (optional)</span>
                <input
                  type="url"
                  value={draft.jellyfin_url || ''}
                  onChange={(e) => updateDraft('jellyfin_url', e.target.value)}
                  placeholder="http://localhost:8096"
                  className={`${inputClass} font-mono`}
                  style={inputStyle}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span>Jellyfin API Key (optional)</span>
                <input
                  type="password"
                  value={draft.jellyfin_api_key || ''}
                  onChange={(e) => updateDraft('jellyfin_api_key', e.target.value)}
                  placeholder="Paste API key"
                  className={`${inputClass} font-mono`}
                  style={inputStyle}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>Navidrome URL (optional)</span>
              <input
                type="url"
                value={draft.navidrome_url || ''}
                onChange={(e) => updateDraft('navidrome_url', e.target.value)}
                placeholder="http://localhost:4533"
                className={`${inputClass} font-mono`}
                style={inputStyle}
              />
            </label>
          </div>
        )}

        {/* FINAL STEP: SUMMARY & FINISH (Admin step 4 / User step 1) */}
        {((isAdmin && step === 4) || (!isAdmin && step === 1)) && (
          <div className="flex flex-col gap-3">
            {!isAdmin && (
              <div
                className="p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3"
                style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}
              >
                <div>
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5" style={{ color: 'var(--mg-accent)' }} />
                    <span>Device Push Alerts</span>
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--mg-muted)' }}>
                    Get notified on this device when downloads finish.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onEnableNotifications()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
                  style={{ backgroundColor: notificationsEnabled ? '#16a34a' : 'var(--mg-accent)' }}
                >
                  {notificationsEnabled ? 'Alerts Enabled' : 'Enable Alerts'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border flex flex-col gap-1" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Active Account</span>
                </div>
                <p className="text-xs font-mono" style={{ color: 'var(--mg-text)' }}>
                  @{user?.username || 'admin'} ({user?.role || 'admin'})
                </p>
                <p className="text-[11px]" style={{ color: 'var(--mg-muted)' }}>
                  {existingUsers.length > 0
                    ? `${existingUsers.length} account(s) on server — all existing accounts preserved.`
                    : '2FA & profile ready.'}
                </p>
              </div>

              {isAdmin && (
                <div className="p-3 rounded-lg border flex flex-col gap-1" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5" style={{ color: 'var(--mg-accent)' }} />
                    <span>Library &amp; Formats</span>
                  </div>
                  <p className="text-[11px] font-mono truncate" style={{ color: 'var(--mg-text)' }}>
                    {draft.yt_base_path || '/media/YouTube'}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--mg-muted)' }}>
                    {draft.video_res || '1080'}p {(draft.container || 'mp4').toUpperCase()} · {(draft.audio_format || 'mp3').toUpperCase()} {draft.audio_bitrate || '320'}k · {draft.stale_timeout_minutes ?? 120}m cleanup
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg border flex items-start gap-2.5 text-xs" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
              <Smartphone className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--mg-accent)' }} />
              <div style={{ color: 'var(--mg-muted)' }}>
                <strong style={{ color: 'var(--mg-text)' }}>Ready for iPad &amp; Desktop:</strong> Completed jobs include{' '}
                <strong style={{ color: 'var(--mg-text)' }}>Preview</strong> for instant streaming and{' '}
                <strong style={{ color: 'var(--mg-text)' }}>Send to Device</strong> for 1-hour Files app downloads. Follow YouTube channels in the sidebar RSS widget anytime.
              </div>
            </div>

            <div className="p-3 rounded-lg border flex items-start gap-2.5 text-xs" style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}>
              <Rss className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--mg-accent)' }} />
              <div className="flex-1 flex flex-wrap items-center justify-between gap-2" style={{ color: 'var(--mg-muted)' }}>
                <span>Want to fine-tune cookies, SMTP email, or custom yt-dlp flags later?</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('settings');
                      onFinish(dontShowAgain);
                    }}
                    className="px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap"
                    style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                  >
                    Open Full Settings
                  </button>
                )}
                {user && !user.totp_enabled && (
                  <button
                    type="button"
                    onClick={() => {
                      onFinish(false);
                      onOpenAccountSecurity();
                    }}
                    className="px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap"
                    style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
                  >
                    Open 2FA Settings
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: 'var(--mg-border)' }}>
          {((isAdmin && step === 4) || (!isAdmin && step === 1)) ? (
            <label className="inline-flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--mg-muted)' }}>
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 accent-[var(--mg-accent)]"
              />
              <span>Don&apos;t automatically open on startup</span>
            </label>
          ) : (
            <div className="text-[11px]" style={{ color: 'var(--mg-muted)' }}>
              Step {step + 1} of {steps.length}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {step > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap"
                style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-text)' }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            {step === 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleStep1Continue()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap disabled:opacity-50"
                style={{ backgroundColor: 'var(--mg-accent)' }}
              >
                <span>
                  {busy
                    ? 'Saving...'
                    : accountAction === 'create' && isAdmin
                    ? 'Create Admin & Next'
                    : 'Next'}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {isAdmin && step === 1 && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep(2)}
                  className="px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap"
                  style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-muted)' }}
                >
                  Skip
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void savePartialSettings(
                      {
                        yt_base_path: draft.yt_base_path,
                        music_base_path: draft.music_base_path,
                        gallery_base_path: draft.gallery_base_path,
                        folder_structure: draft.folder_structure,
                      },
                      2
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap disabled:opacity-50"
                  style={{ backgroundColor: 'var(--mg-accent)' }}
                >
                  <span>{busy ? 'Saving...' : 'Save Libraries & Next'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {isAdmin && step === 2 && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep(3)}
                  className="px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap"
                  style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-muted)' }}
                >
                  Skip
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void savePartialSettings(
                      {
                        video_res: draft.video_res,
                        container: draft.container,
                        audio_format: draft.audio_format,
                        audio_bitrate: draft.audio_bitrate,
                        generate_lrc: Boolean(draft.generate_lrc),
                        stale_timeout_minutes: draft.stale_timeout_minutes,
                      },
                      3
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap disabled:opacity-50"
                  style={{ backgroundColor: 'var(--mg-accent)' }}
                >
                  <span>{busy ? 'Saving...' : 'Save Quality & Next'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {isAdmin && step === 3 && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep(4)}
                  className="px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap"
                  style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-muted)' }}
                >
                  Skip
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void savePartialSettings(
                      {
                        webhook_url: draft.webhook_url || '',
                        jellyfin_url: draft.jellyfin_url || '',
                        jellyfin_api_key: draft.jellyfin_api_key || '',
                        navidrome_url: draft.navidrome_url || '',
                      },
                      4
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap disabled:opacity-50"
                  style={{ backgroundColor: 'var(--mg-accent)' }}
                >
                  <span>{busy ? 'Saving...' : 'Save Connections & Next'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {((isAdmin && step === 4) || (!isAdmin && step === 1)) && (
              <button
                type="button"
                onClick={() => onFinish(dontShowAgain)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap"
                style={{ backgroundColor: 'var(--mg-accent)' }}
              >
                Finish Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


