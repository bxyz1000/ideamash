'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { heatScore } from '@/lib/utils';
import PitchDeckModal, { type ModalIdea } from './PitchDeckModal';
import toast from 'react-hot-toast';

interface Idea extends ModalIdea {}

interface TopIdeasDeckProps {
  ideas: Idea[];
}

const CATEGORY_PILL: Record<string, { bg: string; color: string }> = {
  AI:          { bg: '#dcfce7', color: '#15803d' },
  Marketplace: { bg: '#ede9fe', color: '#7c3aed' },
  B2B:         { bg: '#dbeafe', color: '#1d4ed8' },
  Consumer:    { bg: '#ffedd5', color: '#c2410c' },
  SaaS:        { bg: '#fef9c3', color: '#a16207' },
  Hardware:    { bg: '#fce7f3', color: '#be185d' },
  Other:       { bg: '#f3f4f6', color: '#374151' },
};

const BACK_COLORS = [
  { bg: '#2563EB' },
  { bg: '#1a1a1a' },
  { bg: '#e8e8e2' },
];

function getSlotTransform(slotIndex: number) {
  if (slotIndex === 0) {
    return { rotate: 0, scale: 1, x: 0, y: 0, zIndex: 50, opacity: 1 };
  }
  const rotPerSlot = 8;
  const xPerSlot = 18;
  const yPerSlot = 12;
  const scalePerSlot = 0.04;
  const side = slotIndex % 2 === 1 ? -1 : 1;
  const depth = Math.ceil(slotIndex / 2);
  return {
    rotate: side * rotPerSlot * depth,
    scale: Math.max(0.75, 1 - scalePerSlot * slotIndex),
    x: side * xPerSlot * depth,
    y: yPerSlot * slotIndex,
    zIndex: 50 - slotIndex,
    opacity: slotIndex >= 6 ? 0 : 1,
  };
}

export default function TopIdeasDeck({ ideas: initialIdeas }: TopIdeasDeckProps) {
  const { profile } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [isAnimating, setIsAnimating] = useState(false);
  const [modalIdea, setModalIdea] = useState<Idea | null>(null);

  // Track drag vs click
  const dragDistanceRef = useRef(0);
  const dragStartX = useRef(0);

  if (!ideas || ideas.length === 0) return null;

  const total = ideas.length;
  const VISIBLE_SLOTS = 5;
  const deckOrder = Array.from({ length: Math.min(VISIBLE_SLOTS, total) }, (_, i) =>
    (currentIndex + i) % total
  );

  const goNext = () => {
    if (isAnimating || total <= 1) return;
    setDirection('next');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
      setIsAnimating(false);
    }, 420);
  };

  const goPrev = () => {
    if (isAnimating || total <= 1) return;
    setDirection('prev');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + total) % total);
      setIsAnimating(false);
    }, 420);
  };

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    dragDistanceRef.current = Math.abs(info.offset.x);
    if (info.offset.x < -50) goNext();
    else if (info.offset.x > 50) goPrev();
  };

  // Vote directly from the deck card (upvote only for quick action, full modal for both)
  const handleVote = useCallback(async (e: React.MouseEvent, type: 'up' | 'down') => {
    e.stopPropagation(); // don't open modal
    const idea = ideas[currentIndex];
    if (!idea) return;
    if (!profile) {
      toast.error('Log in to vote');
      return;
    }
    const username = profile.username;
    const ideaRef = doc(db, 'ideas', idea.id);

    let newUp = [...idea.upvotes];
    let newDown = [...idea.downvotes];

    if (type === 'up') {
      if (newUp.includes(username)) {
        newUp = newUp.filter((u) => u !== username);
        await updateDoc(ideaRef, { upvotes: arrayRemove(username) });
      } else {
        newUp.push(username);
        newDown = newDown.filter((u) => u !== username);
        await updateDoc(ideaRef, { upvotes: arrayUnion(username), downvotes: arrayRemove(username) });
        toast.success('🔥 Crazy shit!');
      }
    } else {
      if (newDown.includes(username)) {
        newDown = newDown.filter((u) => u !== username);
        await updateDoc(ideaRef, { downvotes: arrayRemove(username) });
      } else {
        newDown.push(username);
        newUp = newUp.filter((u) => u !== username);
        await updateDoc(ideaRef, { downvotes: arrayUnion(username), upvotes: arrayRemove(username) });
        toast('🗑 Dumped it.');
      }
    }

    setIdeas((prev) =>
      prev.map((item, idx) =>
        idx === currentIndex ? { ...item, upvotes: newUp, downvotes: newDown } : item
      )
    );
  }, [ideas, currentIndex, profile]);

  // When modal votes change, sync back into deck state
  const handleModalVoteChange = useCallback((id: string, upvotes: string[], downvotes: string[]) => {
    setIdeas((prev) =>
      prev.map((item) => (item.id === id ? { ...item, upvotes, downvotes } : item))
    );
  }, []);

  const frontIdea = ideas[currentIndex];
  const pill = CATEGORY_PILL[frontIdea.category] || CATEGORY_PILL.Other;
  const score = heatScore(frontIdea.upvotes, frontIdea.downvotes);
  const username = profile?.username || '';
  const hasUpvoted = frontIdea.upvotes.includes(username);
  const hasDownvoted = frontIdea.downvotes.includes(username);

  const exitX = direction === 'next' ? 480 : -480;
  const exitRotate = direction === 'next' ? 30 : -30;

  return (
    <>
      <section
        style={{
          background: '#000000',
          padding: '100px 24px 80px',
          minHeight: 680,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Section heading */}
        <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: 60 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)',
              marginBottom: 12,
            }}
          >
            Leaderboard
          </p>
          <h2
            style={{
              fontFamily: "'Space Grotesk', 'Inter', sans-serif",
              fontSize: 'clamp(40px, 7vw, 88px)',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.04em',
              lineHeight: 0.95,
              textTransform: 'uppercase',
            }}
          >
            TOP 10<br />IDEAS
          </h2>
        </div>

        {/* Deck container */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48 }}>

          {/* Click-to-open hint */}
          <p
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.3)',
              fontWeight: 500,
              letterSpacing: '0.04em',
              marginBottom: -32,
            }}
          >
            Click card to read full pitch ↓
          </p>

          {/* Card deck */}
          <div
            style={{
              position: 'relative',
              width: 'clamp(260px, 32vw, 320px)',
              height: 'clamp(360px, 46vw, 440px)',
            }}
          >
            {/* Back cards */}
            {deckOrder.slice(1).reverse().map((ideaIdx, i) => {
              const slotIndex = deckOrder.length - 1 - i;
              const t = getSlotTransform(slotIndex);
              const colorSet = BACK_COLORS[(slotIndex - 1) % BACK_COLORS.length];
              return (
                <motion.div
                  key={`back-${ideaIdx}`}
                  animate={{ rotate: t.rotate, scale: t.scale, x: t.x, y: t.y, opacity: t.opacity }}
                  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 24,
                    background: colorSet.bg,
                    zIndex: t.zIndex,
                    willChange: 'transform',
                    transformOrigin: 'bottom center',
                  }}
                />
              );
            })}

            {/* Front card */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={frontIdea.id + '-' + currentIndex}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragStart={() => { dragDistanceRef.current = 0; }}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  // Only open modal if it wasn't a drag gesture
                  if (dragDistanceRef.current < 8) {
                    setModalIdea(frontIdea);
                  }
                  dragDistanceRef.current = 0;
                }}
                initial={{
                  rotate: direction === 'next' ? -20 : 20,
                  x: direction === 'next' ? -300 : 300,
                  opacity: 0,
                  scale: 0.88,
                }}
                animate={{ rotate: 0, x: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: exitRotate, x: exitX, opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 100,
                  borderRadius: 24,
                  background: '#ffffff',
                  cursor: 'pointer',
                  userSelect: 'none',
                  willChange: 'transform',
                  transformOrigin: 'bottom center',
                  boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: 24,
                }}
              >
                {/* Category pill */}
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '5px 12px',
                      borderRadius: 100,
                      background: pill.bg,
                      color: pill.color,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      border: `1px solid ${pill.color}22`,
                    }}
                  >
                    {frontIdea.category}
                  </span>
                </div>

                {/* Big title */}
                <div>
                  <h3
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                      fontSize: 'clamp(22px, 4vw, 30px)',
                      fontWeight: 400,
                      color: '#0a0a0a',
                      lineHeight: 1.18,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {frontIdea.title}
                  </h3>
                </div>

                {/* Vote buttons + counter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Heat bar */}
                  {(frontIdea.upvotes.length + frontIdea.downvotes.length) > 0 && (
                    <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${score}%`,
                          background: score >= 50
                            ? 'linear-gradient(90deg, #3dffc0, #00d4a0)'
                            : 'linear-gradient(90deg, #ff4d6d, #ff2d52)',
                          borderRadius: 2,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  )}

                  {/* Vote buttons row */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={(e) => handleVote(e, 'up')}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '9px 0',
                        borderRadius: 10,
                        border: hasUpvoted ? '1.5px solid #3dffc0' : '1.5px solid rgba(0,0,0,0.1)',
                        background: hasUpvoted ? 'rgba(61,255,192,0.1)' : 'rgba(0,0,0,0.03)',
                        color: hasUpvoted ? '#15803d' : 'rgba(0,0,0,0.5)',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      🔥 {frontIdea.upvotes.length}
                    </button>
                    <button
                      onClick={(e) => handleVote(e, 'down')}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '9px 0',
                        borderRadius: 10,
                        border: hasDownvoted ? '1.5px solid #ff4d6d' : '1.5px solid rgba(0,0,0,0.1)',
                        background: hasDownvoted ? 'rgba(255,77,109,0.08)' : 'rgba(0,0,0,0.03)',
                        color: hasDownvoted ? '#be185d' : 'rgba(0,0,0,0.5)',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      🗑 {frontIdea.downvotes.length}
                    </button>
                  </div>

                  {/* Counter */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.28)', fontWeight: 500 }}>
                      {currentIndex + 1} / {total} · tap to read
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <button
                onClick={goPrev}
                disabled={isAnimating}
                aria-label="Previous idea"
                style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#ffffff', fontSize: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: isAnimating ? 'default' : 'pointer',
                  opacity: isAnimating ? 0.4 : 1,
                  transition: 'background 0.15s, opacity 0.15s',
                }}
                onMouseEnter={(e) => { if (!isAnimating) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              >
                ‹
              </button>

              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
                Swipe
              </span>

              <button
                onClick={goNext}
                disabled={isAnimating}
                aria-label="Next idea"
                style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#ffffff', fontSize: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: isAnimating ? 'default' : 'pointer',
                  opacity: isAnimating ? 0.4 : 1,
                  transition: 'background 0.15s, opacity 0.15s',
                }}
                onMouseEnter={(e) => { if (!isAnimating) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              >
                ›
              </button>
            </div>

            {/* Dot progress */}
            <div style={{ display: 'flex', gap: 6 }}>
              {ideas.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (!isAnimating && i !== currentIndex) {
                      setDirection(i > currentIndex ? 'next' : 'prev');
                      setIsAnimating(true);
                      setTimeout(() => { setCurrentIndex(i); setIsAnimating(false); }, 420);
                    }
                  }}
                  aria-label={`Go to idea ${i + 1}`}
                  style={{
                    width: i === currentIndex ? 20 : 8, height: 8,
                    borderRadius: 4,
                    border: '1.5px solid rgba(255,255,255,0.35)',
                    background: i === currentIndex ? '#ffffff' : 'transparent',
                    padding: 0, cursor: 'pointer',
                    transition: 'all 0.25s ease', outline: 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pitch deck modal */}
      <PitchDeckModal
        idea={modalIdea}
        onClose={() => setModalIdea(null)}
        onVoteChange={handleModalVoteChange}
      />
    </>
  );
}
