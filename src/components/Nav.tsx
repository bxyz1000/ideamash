'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { initials } from '@/lib/utils';

export default function Nav() {
  const { user, profile, logout } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    setMenuOpen(false);
  };

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: scrolled ? 'rgba(10,10,11,0.95)' : 'rgba(10,10,11,0.6)',
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        transition: 'all 0.25s ease',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 22,
            color: '#f5f5f0',
            textDecoration: 'none',
            letterSpacing: '-0.02em',
          }}
        >
          idea<span style={{ color: '#3dffc0' }}>//</span>mash
        </Link>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <Link
                href="/post"
                style={{
                  background: '#3dffc0',
                  color: '#0a0a0b',
                  fontWeight: 700,
                  padding: '9px 18px',
                  borderRadius: 6,
                  fontSize: 14,
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                + Post Idea
              </Link>
              {/* Username + Settings */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f5f5f0' }}>
                  @{profile?.username}
                </span>
                <Link
                  href="/settings"
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.6)',
                    textDecoration: 'none',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f5f5f0')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                >
                  Settings
                </Link>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              style={{
                background: '#3dffc0',
                color: '#0a0a0b',
                fontWeight: 700,
                padding: '9px 18px',
                borderRadius: 6,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Login
            </Link>
          )}
        </div>
      </div>

    </nav>
  );
}
