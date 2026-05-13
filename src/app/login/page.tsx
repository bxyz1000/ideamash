'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/lib/AuthContext';
import { validateUsername } from '@/lib/utils';
import toast from 'react-hot-toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const { signup, login } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push(redirectTo);
      } else {
        setAuthReady(true);
      }
    });
    return unsub;
  }, [router, redirectTo]);

  if (!authReady) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #3dffc0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Signup state
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupError, setSignupError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginUsername || !loginPassword) {
      setLoginError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await login(loginUsername.trim(), loginPassword);
      toast.success('Welcome back!');
      router.push(redirectTo);
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        setLoginError('Wrong username or password.');
      } else {
        setLoginError('Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    const usernameError = validateUsername(signupUsername);
    if (usernameError) { setSignupError(usernameError); return; }
    if (signupPassword.length < 6) { setSignupError('Password must be at least 6 characters.'); return; }
    if (signupPassword !== signupConfirm) { setSignupError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', signupUsername.toLowerCase()));
      if (userDoc.exists()) {
        setSignupError('Username already taken. Try another.');
        setLoading(false);
        return;
      }
      await signup(signupUsername.trim(), signupPassword);
      toast.success('Account created! Welcome to IdeaMash 🔥');
      router.push(redirectTo);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/email-already-in-use') {
        setSignupError('Username already taken.');
      } else {
        setSignupError(error.message || 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#f5f5f0',
    borderRadius: 6,
    padding: '13px 16px',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'rgba(255,255,255,0.4)',
    display: 'block',
    marginBottom: 7,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
      }}
      className="dot-grid"
    >
      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(61,255,192,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: 420,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <a
            href="/"
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: 28,
              color: '#f5f5f0',
              textDecoration: 'none',
              letterSpacing: '-0.02em',
            }}
          >
            idea<span style={{ color: '#3dffc0' }}>//</span>mash
          </a>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#111114',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '32px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          }}
        >
          {/* Tab toggle */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 6,
              padding: 3,
              marginBottom: 28,
            }}
          >
            {(['login', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setLoginError(''); setSignupError(''); }}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 4,
                  border: 'none',
                  background: tab === t ? '#1e1e24' : 'transparent',
                  color: tab === t ? '#f5f5f0' : 'rgba(255,255,255,0.4)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {t === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          {/* Login Form */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>Username</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="your_username"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#3dffc0')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#3dffc0')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                  autoComplete="current-password"
                  required
                />
              </div>
              {loginError && (
                <div
                  style={{
                    background: 'rgba(255,77,109,0.08)',
                    border: '1px solid rgba(255,77,109,0.25)',
                    borderRadius: 6,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: '#ff4d6d',
                  }}
                >
                  {loginError}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: '#3dffc0',
                  color: '#0a0a0b',
                  fontWeight: 700,
                  padding: '14px 0',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 15,
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  fontFamily: 'Inter, sans-serif',
                  transition: 'opacity 0.15s, transform 0.15s',
                  marginTop: 4,
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.opacity = '1')}
              >
                {loading ? 'Logging in...' : 'Log in →'}
              </button>
            </form>
          )}

          {/* Signup Form */}
          {tab === 'signup' && (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>Username</label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: 15,
                      pointerEvents: 'none',
                    }}
                  >
                    @
                  </span>
                  <input
                    type="text"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="your_username"
                    style={{ ...inputStyle, paddingLeft: 28 }}
                    onFocus={(e) => (e.target.style.borderColor = '#3dffc0')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                    maxLength={20}
                    required
                  />
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>
                  Letters, numbers, underscores only. 3–20 chars.
                </p>
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#3dffc0')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <input
                  type="password"
                  value={signupConfirm}
                  onChange={(e) => setSignupConfirm(e.target.value)}
                  placeholder="Repeat password"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#3dffc0')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                  autoComplete="new-password"
                  required
                />
              </div>
              {signupError && (
                <div
                  style={{
                    background: 'rgba(255,77,109,0.08)',
                    border: '1px solid rgba(255,77,109,0.25)',
                    borderRadius: 6,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: '#ff4d6d',
                  }}
                >
                  {signupError}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: '#3dffc0',
                  color: '#0a0a0b',
                  fontWeight: 700,
                  padding: '14px 0',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 15,
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  fontFamily: 'Inter, sans-serif',
                  transition: 'opacity 0.15s',
                  marginTop: 4,
                }}
              >
                {loading ? 'Creating account...' : 'Create account →'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
          No Google. No email. Just username + password.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
