'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import Nav from '@/components/Nav';
import Ticker from '@/components/Ticker';
import IdeaCard from '@/components/IdeaCard';
import IdeaCardSkeleton from '@/components/IdeaCardSkeleton';
import TopIdeasDeck from '@/components/TopIdeasDeck';
import PitchDeckModal, { type ModalIdea } from '@/components/PitchDeckModal';
import Footer from '@/components/Footer';
import { heatScore } from '@/lib/utils';
import { generateAiCard } from '@/lib/gemini';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'AI', 'Marketplace', 'B2B', 'Consumer', 'SaaS', 'Hardware', 'Other'];
const SORTS = ['Hot', 'New', 'Controversial'];

const SEED_IDEAS = [
  { author: 'ghostfounder', title: 'AI ghostwriter that learns YOUR voice', desc: 'Founders are bad writers. An AI that learns your voice from Slack and Twitter then writes emails, LinkedIn posts, and pitch decks in your actual tone. Target: non-tech founders who hate writing.', category: 'AI', upvotes: ['stealthmode', 'buildfast'], downvotes: [], comments: [], video: '' },
  { author: 'buildfast', title: 'WhatsApp OS for Indian kirana stores', desc: 'Kirana stores run their whole business on WhatsApp groups — suppliers, accountants, customers. Total chaos. An app that auto-organises those chats into orders, invoices, and inventory. No new behaviour needed.', category: 'B2B', upvotes: ['ghostfounder', 'stealthmode', 'redpill'], downvotes: [], comments: [{ id: 'c1', author: 'redpill', text: 'This is real. My uncle runs a kirana and lives on WhatsApp.', ts: Date.now() }], video: '' },
  { author: 'stealthmode', title: 'Anonymous salary DB for Indian startups', desc: 'Startup salaries in India are a black box. A fully anonymous database where employees submit comp, equity, role, company — verified by offer letter. Job seekers get real leverage.', category: 'B2B', upvotes: ['ghostfounder', 'buildfast'], downvotes: ['redpill'], comments: [], video: '' },
  { author: 'redpill', title: 'Rent-a-co-founder marketplace', desc: 'Solo founders burn out and make bad decisions alone. Hire experienced operators part-time as co-founder — equity optional, fixed retainer. Fractional CTO but for everything.', category: 'Marketplace', upvotes: ['stealthmode'], downvotes: [], comments: [], video: '' },
  { author: 'ghostfounder', title: 'Vernacular pitch deck builder', desc: 'Most Indian founders pitch in English but think in Hindi, Tamil, Telugu. A tool that lets you build pitch decks in your language then auto-translates for investors. Huge untapped tier-2/3 market.', category: 'SaaS', upvotes: ['buildfast', 'stealthmode', 'redpill'], downvotes: [], comments: [], video: '' },
  { author: 'buildfast', title: 'UPI split for college students', desc: 'College students split bills constantly — mess fees, trips, supplies — but current apps are too complex. A dead-simple UPI-native split app built for Indian college groups with WhatsApp integration.', category: 'Consumer', upvotes: ['ghostfounder'], downvotes: ['stealthmode'], comments: [], video: '' },
  { author: 'stealthmode', title: 'B2B SaaS for CA firms in India', desc: 'India has 300,000+ CA firms still running on Excel and WhatsApp. A simple practice management SaaS for client tracking, document collection, deadline reminders. Massive underserved market.', category: 'SaaS', upvotes: ['redpill', 'buildfast', 'ghostfounder'], downvotes: [], comments: [], video: '' },
  { author: 'redpill', title: 'Micro-internship platform for tier-2 colleges', desc: 'Tier-2 college students in India have zero access to real work experience. A platform connecting them with early-stage startups for 2-4 week paid micro-internships. Startups get cheap talent, students get experience.', category: 'Marketplace', upvotes: ['ghostfounder', 'stealthmode'], downvotes: [], comments: [], video: '' },
];

interface Idea {
  id: string;
  author: string;
  title: string;
  desc: string;
  category: string;
  upvotes: string[];
  downvotes: string[];
  comments: { id: string; author: string; text: string; ts: number }[];
  ts: number;
  aiCard?: { headline: string; insights: string[] } | null;
}

interface Stats {
  ideas: number;
  votes: number;
  comments: number;
}


export default function HomePage() {
  const { profile } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ ideas: 0, votes: 0, comments: 0 });
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('Hot');
  const [modalIdea, setModalIdea] = useState<ModalIdea | null>(null);
  const [hasError, setHasError] = useState(false);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'ideas'));
      let votes = 0;
      let comments = 0;
      snap.forEach((doc) => {
        const d = doc.data();
        votes += (d.upvotes?.length || 0) + (d.downvotes?.length || 0);
        comments += d.comments?.length || 0;
      });
      setStats({ ideas: snap.size, votes, comments });
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Live ideas
  useEffect(() => {
    const q = query(collection(db, 'ideas'), orderBy('ts', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        if (!localStorage.getItem('ideamash_seeded')) {
          localStorage.setItem('ideamash_seeded', 'true');
          const seedFirestore = async () => {
            try {
              for (const idea of SEED_IDEAS) {
                const ref = await addDoc(collection(db, 'ideas'), {
                  ...idea,
                  authorUid: 'seed_uid',
                  ts: serverTimestamp(),
                  aiCard: null,
                });
                generateAiCard(idea.title, idea.desc).then((aiCard) => {
                  if (aiCard) updateDoc(doc(db, 'ideas', ref.id), { aiCard });
                });
              }
            } catch (err) {
              console.error('Seed failed', err);
            }
          };
          seedFirestore();
        }
      }

      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        ts: d.data().ts?.toMillis?.() || Date.now(),
        upvotes: d.data().upvotes || [],
        downvotes: d.data().downvotes || [],
        comments: d.data().comments || [],
      })) as Idea[];
      setIdeas(docs);
      setLoading(false);
      setHasError(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
      setHasError(true);
    });
    return unsub;
  }, []);

  const fallbackIdeas = SEED_IDEAS.map((si, i) => ({
    ...si,
    id: `seed-${i}`,
    ts: Date.now() - i * 10000,
    aiCard: null,
  })) as Idea[];

  // Show seed data as fallback if error or empty (but not while loading)
  const displayIdeas = ideas.length > 0 ? ideas : (loading ? [] : fallbackIdeas);

  const sorted = [...displayIdeas]
    .filter((i) => category === 'All' || i.category === category)
    .sort((a, b) => {
      if (sort === 'New') return b.ts - a.ts;
      if (sort === 'Hot') {
        return heatScore(b.upvotes, b.downvotes) - heatScore(a.upvotes, a.downvotes);
      }
      if (sort === 'Controversial') {
        const totalA = a.upvotes.length + a.downvotes.length;
        const totalB = b.upvotes.length + b.downvotes.length;
        const spreadA = Math.abs(heatScore(a.upvotes, a.downvotes) - 50);
        const spreadB = Math.abs(heatScore(b.upvotes, b.downvotes) - 50);
        if (spreadA !== spreadB) return spreadA - spreadB;
        return totalB - totalA;
      }
      return 0;
    });

  const top10 = [...displayIdeas]
    .sort((a, b) => {
      const scoreA = heatScore(a.upvotes, a.downvotes) * (a.upvotes.length + a.downvotes.length);
      const scoreB = heatScore(b.upvotes, b.downvotes) * (b.upvotes.length + b.downvotes.length);
      return scoreB - scoreA;
    })
    .slice(0, 10);

  // Auth-aware CTA href
  const ctaHref = profile ? '/post' : '/login?redirect=/post';

  // Real stats from Firestore
  const displayStats = stats;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b' }}>
      <Nav />

      {/* HERO */}
      <section
        style={{
          background: '#0a0a0b',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px 24px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, rgba(61,255,192,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', maxWidth: 860, textAlign: 'center' }}>
          {/* Eyebrow */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 28,
              padding: '6px 16px',
              background: 'rgba(61,255,192,0.08)',
              border: '1px solid rgba(61,255,192,0.2)',
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 600,
              color: '#3dffc0',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <span>🇮🇳</span> for Indian founders
          </div>

          {/* Main headline */}
          <h1
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: 'clamp(48px, 8vw, 96px)',
              lineHeight: 1.0,
              color: '#f5f5f0',
              letterSpacing: '-0.03em',
              marginBottom: 28,
            }}
          >
            India&apos;s Startup Ideas.
            <br />
            <span
              style={{
                WebkitTextStroke: '2px #f5f5f0',
                color: 'transparent',
              }}
            >
              Judged by Real
            </span>{' '}
            <span style={{ color: '#3dffc0', fontStyle: 'italic' }}>Humans.</span>
          </h1>

          {/* Sub */}
          <p
            style={{
              fontSize: 'clamp(16px, 2.5vw, 20px)',
              color: 'rgba(255,255,255,0.5)',
              maxWidth: 560,
              margin: '0 auto 40px',
              lineHeight: 1.55,
            }}
          >
            No AI hype. No fake validation. Just brutal honest votes.
            <br />
            <strong style={{ color: '#f5f5f0', fontWeight: 600 }}>
              🔥 crazy shit
            </strong>{' '}
            or{' '}
            <strong style={{ color: '#f5f5f0', fontWeight: 600 }}>🗑 dump it.</strong>
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="#all-ideas"
              style={{
                background: '#f5f5f0',
                color: '#0a0a0b',
                fontWeight: 700,
                padding: '14px 28px',
                borderRadius: 6,
                fontSize: 15,
                textDecoration: 'none',
                transition: 'transform 0.15s, opacity 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              See All Ideas ↓
            </a>
            <Link
              href={ctaHref}
              style={{
                background: '#3dffc0',
                color: '#0a0a0b',
                fontWeight: 700,
                padding: '14px 28px',
                borderRadius: 6,
                fontSize: 15,
                textDecoration: 'none',
                transition: 'transform 0.15s, opacity 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              Drop Your Idea →
            </Link>
          </div>
        </div>

        {/* Stats bar — only show when there's real data */}
        {stats.ideas > 0 && (
          <div
            style={{
              marginTop: 60,
              display: 'flex',
              gap: 48,
              flexWrap: 'wrap',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 10,
            }}
          >
            {[
              { label: 'ideas posted', value: stats.ideas },
              { label: 'votes cast', value: stats.votes },
              { label: 'comments', value: stats.comments },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: 'DM Serif Display, serif',
                    fontSize: 36,
                    color: '#3dffc0',
                    lineHeight: 1,
                  }}
                >
                  {s.value.toLocaleString()}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.35)',
                    marginTop: 4,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* TICKER */}
      <Ticker />

      {/* TOP 10 IDEAS — Card Deck */}
      {loading ? (
        <section style={{ background: '#000000', padding: '80px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
              Leaderboard
            </p>
            <div style={{ fontSize: 'clamp(40px, 7vw, 88px)', fontWeight: 800, color: '#222', letterSpacing: '-0.04em', lineHeight: 0.95, textTransform: 'uppercase', marginBottom: 60 }}>
              TOP 10<br />IDEAS
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="skeleton" style={{ width: 320, height: 440, borderRadius: 24 }} />
            </div>
          </div>
        </section>
      ) : (
        <TopIdeasDeck ideas={top10} />
      )}

      {/* TICKER 2 */}
      <Ticker />

      {/* ALL IDEAS */}
      <section
        id="all-ideas"
        style={{ background: '#f5f5f0', padding: '80px 0 100px' }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: 36,
              flexWrap: 'wrap',
              gap: 20,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(0,0,0,0.35)',
                  marginBottom: 10,
                }}
              >
                Feed
              </p>
              <h2
                style={{
                  fontFamily: 'DM Serif Display, serif',
                  fontSize: 'clamp(32px, 4vw, 52px)',
                  color: '#0a0a0b',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                All Ideas
              </h2>
            </div>

            {/* Sort */}
            <div style={{ display: 'flex', gap: 8 }}>
              {SORTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: `1.5px solid ${sort === s ? '#0a0a0b' : 'rgba(0,0,0,0.15)'}`,
                    background: sort === s ? '#0a0a0b' : 'transparent',
                    color: sort === s ? '#f5f5f0' : 'rgba(0,0,0,0.6)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {hasError && (
            <div style={{ background: 'rgba(255, 77, 109, 0.1)', padding: '16px', borderRadius: '8px', color: '#ff4d6d', marginBottom: '24px', fontSize: 14 }}>
              Unable to load live ideas. Showing fallback data.
            </div>
          )}

          {/* Feed Content */}
          {loading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 20,
              }}
            >
              {Array(3).fill(0).map((_, i) => (
                <IdeaCardSkeleton key={i} variant="light" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(0,0,0,0.4)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌵</div>
              <p style={{ fontSize: 16 }}>No ideas in this category yet.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 20,
              }}
            >
              {sorted.map((idea) => (
                <div key={idea.id} className="fade-in">
                  <IdeaCard
                    idea={idea}
                    variant="light"
                    onCardClick={(clicked) => setModalIdea(clicked)}
                  />
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* MISSION */}
      <section
        style={{
          background: '#0a0a0b',
          padding: '100px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            right: '-10%',
            width: 500,
            height: 500,
            background: 'radial-gradient(circle, rgba(255,77,109,0.05) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
          <h2
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: 'clamp(32px, 5vw, 64px)',
              color: '#f5f5f0',
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              marginBottom: 28,
            }}
          >
            Tired of AI telling you your idea is great?
            <span style={{ color: '#ff4d6d', fontStyle: 'italic' }}> So are we.</span>
          </h2>
          <p
            style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.65,
              marginBottom: 20,
            }}
          >
            Every ChatGPT says your idea is &ldquo;innovative and has strong market potential.&rdquo; Every friend says{' '}
            &ldquo;sounds cool bro.&rdquo; But real validation comes from real founders who&apos;ve been in the trenches.
          </p>
          <p
            style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.65,
              marginBottom: 40,
            }}
          >
            IdeaMash cuts through the noise. Post your startup idea. Get voted on by the Indian founder community.{' '}
            Find out if it&apos;s{' '}
            <strong style={{ color: '#3dffc0' }}>🔥 crazy shit</strong> worth building — or straight to the{' '}
            <strong style={{ color: '#ff4d6d' }}>🗑 dump</strong>.
          </p>
          <Link
            href={ctaHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#3dffc0',
              color: '#0a0a0b',
              fontWeight: 700,
              padding: '16px 32px',
              borderRadius: 6,
              fontSize: 16,
              textDecoration: 'none',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            Drop Your Idea — It&apos;s Free →
          </Link>
        </div>
      </section>

      <Footer />

      {/* Global pitch deck modal for all-ideas feed */}
      <PitchDeckModal
        idea={modalIdea}
        onClose={() => setModalIdea(null)}
        onVoteChange={(id, upvotes, downvotes) => {
          setIdeas((prev) =>
            prev.map((item) => (item.id === id ? { ...item, upvotes, downvotes } : item))
          );
        }}
      />
    </div>
  );
}
