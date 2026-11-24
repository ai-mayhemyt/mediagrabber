import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, UserPlus, Palette, Sun, Moon, ShieldCheck } from 'lucide-react';
import { UserAccount } from '../types';
import { BrandLogo } from './BrandLogo';

interface AuthScreenProps {
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenTheme: () => void;
  onAuthenticated: (user: UserAccount) => void;
  onNotify: (type: 'info' | 'success' | 'error', msg: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  themeMode,
  onToggleTheme,
  onOpenTheme,
  onAuthenticated,
  onNotify,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password,
            totp_code: needs2fa ? totpCode.trim() : undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (data.requires_2fa) {
            setNeeds2fa(true);
          }
          setError(data.error || 'Unable to sign in.');
          return;
        }
        onNotify('success', `Signed in as ${data.user.display_name}.`);
        onAuthenticated(data.user);
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            display_name: displayName.trim() || undefined,
            email: email.trim() || undefined,
            password,
            password2,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || 'Registration failed.');
          return;
        }
        onNotify('success', `Account created (${data.user.role} role). Signed in as ${data.user.username}.`);
        onAuthenticated(data.user);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--mg-bg)', color: 'var(--mg-text)' }}
    >
      <header
        className="flex items-center justify-between gap-4 px-6 py-4 border-b"
        style={{ borderColor: 'var(--mg-border)', backgroundColor: 'var(--mg-sidebar)' }}
      >
        <div className="inline-flex items-center gap-2.5 whitespace-nowrap">
          <BrandLogo className="w-7 h-7 shrink-0" />
          <span
            className="font-display text-xl font-bold tracking-tight bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #a0b4ff 0%, #5b7cfa 100%)' }}
          >
            MediaGrabber
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenTheme}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--mg-card)',
              borderColor: 'var(--mg-border)',
              color: 'var(--mg-text)',
            }}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Theme Editor</span>
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--mg-card)',
              borderColor: 'var(--mg-border)',
              color: 'var(--mg-text)',
            }}
          >
            {themeMode === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-5">
        <div
          className="w-full max-w-md rounded-xl border p-6 flex flex-col gap-5"
          style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
        >
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-lg font-semibold">
              {mode === 'login' ? 'Sign in to MediaGrabber' : 'Create a MediaGrabber Account'}
            </h1>
            <p className="text-xs" style={{ color: 'var(--mg-muted)' }}>
              {mode === 'login'
                ? 'Enter your credentials to access your download queue and library.'
                : 'New accounts are created with the standard "user" role by default.'}
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-1 p-1 rounded-lg border"
            style={{ backgroundColor: 'var(--mg-bg)', borderColor: 'var(--mg-border)' }}
          >
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className="flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors"
              style={{
                backgroundColor: mode === 'login' ? 'var(--mg-accent)' : 'transparent',
                color: mode === 'login' ? '#ffffff' : 'var(--mg-muted)',
              }}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
                setNeeds2fa(false);
              }}
              className="flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors"
              style={{
                backgroundColor: mode === 'register' ? 'var(--mg-accent)' : 'transparent',
                color: mode === 'register' ? '#ffffff' : 'var(--mg-muted)',
              }}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {error && (
            <div className="px-3.5 py-2.5 rounded-lg border border-red-500/40 bg-red-500/10 text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>Username</span>
              <input
                type="text"
                required
                minLength={mode === 'register' ? 3 : 1}
                maxLength={32}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex_media"
                className="px-3 py-2 rounded-lg border text-sm outline-none"
                style={{
                  backgroundColor: 'var(--mg-bg)',
                  borderColor: 'var(--mg-border)',
                  color: 'var(--mg-text)',
                }}
              />
            </label>

            {mode === 'register' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs font-medium">
                  <span>Display Name (optional)</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex"
                    className="px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--mg-bg)',
                      borderColor: 'var(--mg-border)',
                      color: 'var(--mg-text)',
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium">
                  <span>Email (optional)</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--mg-bg)',
                      borderColor: 'var(--mg-border)',
                      color: 'var(--mg-text)',
                    }}
                  />
                </label>
              </div>
            )}

            <label className="flex flex-col gap-1 text-xs font-medium">
              <span>Password{mode === 'register' ? ' (min 8 chars)' : ''}</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={mode === 'register' ? 8 : 1}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 rounded-lg border text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--mg-bg)',
                    borderColor: 'var(--mg-border)',
                    color: 'var(--mg-text)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            {mode === 'register' && (
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span>Confirm Password</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="••••••••"
                  className="px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--mg-bg)',
                    borderColor: 'var(--mg-border)',
                    color: 'var(--mg-text)',
                  }}
                />
              </label>
            )}

            {mode === 'login' && needs2fa && (
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--mg-accent)' }} />
                  <span>2FA Verification Code</span>
                </span>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="6-digit authenticator code"
                  className="px-3 py-2 rounded-lg border text-sm font-mono text-center outline-none"
                  style={{
                    backgroundColor: 'var(--mg-bg)',
                    borderColor: 'var(--mg-border)',
                    color: 'var(--mg-text)',
                  }}
                />
              </label>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--mg-accent)' }}
            >
              {mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{busy ? 'Signing in...' : 'Sign In'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{busy ? 'Creating account...' : 'Create User Account'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
