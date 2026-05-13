'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/lib/AuthContext';
import { generateAiCard } from '@/lib/gemini';
import Nav from '@/components/Nav';
import toast from 'react-hot-toast';

const CATEGORIES = ['AI', 'Marketplace', 'B2B', 'Consumer', 'SaaS', 'Hardware', 'Other'];

export default function PostPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('');
  const [video, setVideo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [authReady, setAuthReady] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login?redirect=/post');
      } else {
        setAuthReady(true);
      }
    });
    return unsub;
  }, [router]);

  if (!authReady) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #3dffc0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  // Still need profile to get username
  if (!user || (!profile && loading)) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #3dffc0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (desc.trim().length < 50) { toast.error('Description must be at least 50 characters'); return; }
    if (!category) { toast.error('Pick a category'); return; }

    setSubmitting(true);
    try {
      // Create the idea doc
      const ideaRef = await addDoc(collection(db, 'ideas'), {
        author: profile?.username || user.uid,
        authorUid: user.uid,
        title: title.trim(),
        desc: desc.trim(),
        category,
        video: video.trim(),
        upvotes: [],
        downvotes: [],
        comments: [],
        ts: serverTimestamp(),
        aiCard: null,
      });

      toast.success('Idea posted! Generating AI card...');

      // Generate AI card in background
      setAiLoading(true);
      const aiCard = await generateAiCard(title.trim(), desc.trim());
      if (aiCard) {
        await updateDoc(doc(db, 'ideas', ideaRef.id), { aiCard });
      }
      setAiLoading(false);

      toast.success('🔥 Your idea is live!');
      router.push('/');
    } catch (err) {
      console.error(err);
      toast.error('Failed to post idea. Try again.');
      setSubmitting(false);
      setAiLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#f5f5f0',
    borderRadius: 6,
    padding: '14px 16px',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s',
    resize: 'vertical' as const,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'rgba(255,255,255,0.4)',
    display: 'block',
    marginBottom: 8,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b' }}>
      <Nav />

      <div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '100px 24px 80px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#3dffc0',
              marginBottom: 12,
            }}
          >
            Share your vision
          </p>
          <h1
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: 'clamp(36px, 5vw, 56px)',
              color: '#f5f5f0',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginBottom: 12,
            }}
          >
            Drop Your Idea
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
            Be specific. Be honest. The community will judge it brutally — that&apos;s the point.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: '#111114',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '36px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {/* Title */}
          <div>
            <label style={labelStyle}>
              Idea Title <span style={{ color: '#ff4d6d' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Zomato but for tiffin dabbas"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#3dffc0')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              maxLength={100}
              required
            />
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 5 }}>
              {title.length}/100 chars
            </p>
          </div>

          {/* Pitch */}
          <div>
            <label style={labelStyle}>
              Pitch Description <span style={{ color: '#ff4d6d' }}>*</span>
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Explain the problem you're solving, who it's for, and why now. Be specific — vague pitches get dumped."
              style={{ ...inputStyle, minHeight: 160 }}
              onFocus={(e) => (e.target.style.borderColor = '#3dffc0')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              minLength={50}
              maxLength={1000}
              required
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 5,
                fontSize: 11,
                color: 'rgba(255,255,255,0.25)',
              }}
            >
              <span>{desc.length < 50 ? `${50 - desc.length} more chars needed` : '✓ Good'}</span>
              <span>{desc.length}/1000</span>
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>
              Category <span style={{ color: '#ff4d6d' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: `1.5px solid ${category === cat ? '#3dffc0' : 'rgba(255,255,255,0.1)'}`,
                    background: category === cat ? 'rgba(61,255,192,0.1)' : 'transparent',
                    color: category === cat ? '#3dffc0' : 'rgba(255,255,255,0.5)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Video (optional) */}
          <div>
            <label style={labelStyle}>
              Video Link{' '}
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'none', letterSpacing: 0 }}>
                optional
              </span>
            </label>
            <input
              type="url"
              value={video}
              onChange={(e) => setVideo(e.target.value)}
              placeholder="https://youtube.com/..."
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#3dffc0')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          {/* AI note */}
          <div
            style={{
              background: 'rgba(61,255,192,0.05)',
              border: '1px solid rgba(61,255,192,0.15)',
              borderRadius: 6,
              padding: '12px 16px',
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <span style={{ color: '#3dffc0', flexShrink: 0 }}>✦</span>
            <span>
              Gemini AI will auto-generate a headline + 3 key insights for your idea card after posting.
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || aiLoading}
            style={{
              background: '#3dffc0',
              color: '#0a0a0b',
              fontWeight: 700,
              padding: '16px 0',
              borderRadius: 6,
              border: 'none',
              fontSize: 16,
              cursor: submitting || aiLoading ? 'wait' : 'pointer',
              opacity: submitting || aiLoading ? 0.75 : 1,
              fontFamily: 'Inter, sans-serif',
              transition: 'opacity 0.15s, transform 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
            onMouseEnter={(e) => !submitting && (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {submitting ? (
              <>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: '2px solid rgba(0,0,0,0.2)',
                    borderTop: '2px solid #0a0a0b',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                {aiLoading ? 'Generating AI Card...' : 'Posting...'}
              </>
            ) : (
              'Post Idea — Let Them Judge 🔥'
            )}
          </button>
        </form>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
