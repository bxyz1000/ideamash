'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/lib/AuthContext';
import Nav from '@/components/Nav';
import IdeaCard from '@/components/IdeaCard';
import PitchDeckModal, { type ModalIdea } from '@/components/PitchDeckModal';
import { initials } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, logout, refreshProfile } = useAuth();
  const [authReady, setAuthReady] = useState(false);

  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [myIdeas, setMyIdeas] = useState<any[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [modalIdea, setModalIdea] = useState<ModalIdea | null>(null);

  // Auth protection
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login?redirect=/settings');
      } else {
        setAuthReady(true);
      }
    });
    return unsub;
  }, [router]);

  // Load bio & ideas
  useEffect(() => {
    if (profile) {
      setBio(profile.bio || '');
    }
    if (user && profile) {
      const fetchIdeas = async () => {
        try {
          const q = query(collection(db, 'ideas'), where('author', '==', profile.username));
          const snap = await getDocs(q);
          const docs = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            ts: d.data().ts?.toMillis?.() || Date.now(),
          }));
          // Sort by date desc locally
          docs.sort((a, b) => b.ts - a.ts);
          setMyIdeas(docs);
        } catch (err) {
          console.error(err);
        } finally {
          setIdeasLoading(false);
        }
      };
      fetchIdeas();
    }
  }, [user, profile]);

  if (!authReady || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #3dffc0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const handleSaveBio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bio.length > 100) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.username), { bio });
      await refreshProfile();
      toast.success('Bio updated!');
    } catch (err) {
      toast.error('Failed to update bio');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#f5f5f0',
    borderRadius: 6,
    padding: '12px 16px',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', paddingBottom: 100 }}>
      <Nav />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '120px 24px 40px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 40, color: '#f5f5f0', marginBottom: 40, lineHeight: 1 }}>
          Settings
        </h1>

        {/* Profile Section */}
        <section style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 32, marginBottom: 40 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
            Profile
          </h2>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: profile.pfpColor || '#3dffc0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 700,
                color: '#0a0a0b',
                flexShrink: 0,
              }}
            >
              {initials(profile.username)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#f5f5f0', marginBottom: 4 }}>
                @{profile.username}
              </div>
              <form onSubmit={handleSaveBio} style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                  Bio (max 100 chars)
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={100}
                    placeholder="What are you building?"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = '#3dffc0')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                  <button
                    type="submit"
                    disabled={saving || bio === (profile.bio || '')}
                    style={{
                      background: '#3dffc0',
                      color: '#0a0a0b',
                      fontWeight: 700,
                      padding: '0 20px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: saving || bio === (profile.bio || '') ? 'not-allowed' : 'pointer',
                      opacity: saving || bio === (profile.bio || '') ? 0.5 : 1,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {saving ? '...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* My Ideas */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
            My Ideas
          </h2>
          {ideasLoading ? (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading...</div>
          ) : myIdeas.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: '#111114', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
              You haven&apos;t posted any ideas yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {myIdeas.map((idea) => (
                <div key={idea.id}>
                  <IdeaCard idea={idea} variant="light" onCardClick={setModalIdea} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Seed Database (Dev Only) */}
        {process.env.NODE_ENV === 'development' && (
          <section style={{ marginBottom: 40, padding: 32, background: 'rgba(61,255,192,0.05)', borderRadius: 12, border: '1px solid rgba(61,255,192,0.2)' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3dffc0', marginBottom: 12 }}>
              Developer Tools
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 20 }}>
              Populate Firestore with 50 AI-generated ideas, comments, and fake users. This takes a few minutes.
            </p>
            <button
              onClick={async (e) => {
                const btn = e.currentTarget;
                btn.disabled = true;
                btn.innerText = 'Seeding... Check console';
                try {
                  const res = await fetch('/api/seed', { method: 'POST' });
                  if (!res.body) throw new Error('No response body');
                  const reader = res.body.getReader();
                  const decoder = new TextDecoder();
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(Boolean);
                    lines.forEach(l => {
                      try {
                        const { log } = JSON.parse(l);
                        console.log(log);
                      } catch (e) {}
                    });
                  }
                  toast.success('Seed complete! Refreshing...');
                  setTimeout(() => window.location.reload(), 1500);
                } catch (err) {
                  toast.error('Seed failed');
                } finally {
                  btn.disabled = false;
                  btn.innerText = 'Seed Database';
                }
              }}
              style={{
                background: '#3dffc0',
                color: '#0a0a0b',
                fontWeight: 700,
                padding: '12px 24px',
                borderRadius: 6,
                border: 'none',
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Seed Database
            </button>
          </section>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,77,109,0.1)',
            color: '#ff4d6d',
            fontWeight: 700,
            padding: '12px 24px',
            borderRadius: 6,
            border: '1px solid rgba(255,77,109,0.2)',
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,77,109,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,77,109,0.1)')}
        >
          Log Out
        </button>
      </div>

      {modalIdea && (
        <PitchDeckModal idea={modalIdea} onClose={() => setModalIdea(null)} />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
