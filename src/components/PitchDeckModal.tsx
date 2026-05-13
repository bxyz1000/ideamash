'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { heatScore, heatLabel, timeAgo, initials } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  author: string;
  text: string;
  ts: number;
}

export interface ModalIdea {
  id: string;
  author: string;
  title: string;
  desc: string;
  category: string;
  upvotes: string[];
  downvotes: string[];
  comments: Comment[];
  ts: number;
  aiCard?: { headline: string; insights: string[] } | null;
}

interface PitchDeckModalProps {
  idea: ModalIdea | null;
  onClose: () => void;
  /** Called when votes change so parent can update its state */
  onVoteChange?: (id: string, upvotes: string[], downvotes: string[]) => void;
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

export default function PitchDeckModal({ idea, onClose, onVoteChange }: PitchDeckModalProps) {
  const { profile } = useAuth();
  const [local, setLocal] = useState<ModalIdea | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  // Sync when idea changes
  useEffect(() => {
    setLocal(idea);
    setCommentText('');
  }, [idea]);

  // Lock body scroll
  useEffect(() => {
    if (idea) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [idea]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const vote = useCallback(async (type: 'up' | 'down') => {
    if (!local) return;
    if (!profile) {
      toast.error('Log in to vote');
      return;
    }
    const username = profile.username;
    const ideaRef = doc(db, 'ideas', local.id);

    // Optimistic update
    let newUp = [...local.upvotes];
    let newDown = [...local.downvotes];

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

    const updated = { ...local, upvotes: newUp, downvotes: newDown };
    setLocal(updated);
    onVoteChange?.(local.id, newUp, newDown);
  }, [local, profile, onVoteChange]);

  const postComment = async () => {
    if (!local) return;
    if (!profile) { toast.error('Log in to comment'); return; }
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      const newComment: Comment = {
        id: Date.now().toString(),
        author: profile.username,
        text: commentText.trim(),
        ts: Date.now(),
      };
      await updateDoc(doc(db, 'ideas', local.id), { comments: arrayUnion(newComment) });
      setLocal({ ...local, comments: [...local.comments, newComment] });
      setCommentText('');
      toast.success('Comment posted!');
    } finally {
      setCommenting(false);
    }
  };

  if (!local) return null;

  const pill = CATEGORY_PILL[local.category] || CATEGORY_PILL.Other;
  const score = heatScore(local.upvotes, local.downvotes);
  const isHot = score >= 50;
  const username = profile?.username || '';
  const hasUpvoted = local.upvotes.includes(username);
  const hasDownvoted = local.downvotes.includes(username);
  const total = local.upvotes.length + local.downvotes.length;

  return (
    <AnimatePresence>
      {idea && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.82)',
              zIndex: 1000,
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />

          {/* Modal panel — slides up from bottom */}
          <motion.div
            key="modal"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1001,
              background: '#ffffff',
              borderRadius: '24px 24px 0 0',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 -24px 80px rgba(0,0,0,0.4)',
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                paddingTop: 12,
                paddingBottom: 4,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                }}
                onClick={onClose}
              />
            </div>

            <div style={{ padding: '20px 28px 48px', maxWidth: 720, margin: '0 auto' }}>
              {/* Header row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '5px 14px',
                    borderRadius: 100,
                    background: pill.bg,
                    color: pill.color,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {local.category}
                </span>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: '1px solid rgba(0,0,0,0.1)',
                    background: 'rgba(0,0,0,0.04)',
                    color: 'rgba(0,0,0,0.5)',
                    fontSize: 18,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>

              {/* Title */}
              <h2
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: 'clamp(26px, 5vw, 40px)',
                  fontWeight: 400,
                  color: '#0a0a0a',
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  marginBottom: 12,
                }}
              >
                {local.title}
              </h2>

              {/* Meta */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 28,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: 'rgba(0,0,0,0.4)',
                    fontWeight: 500,
                  }}
                >
                  @{local.author} · {timeAgo(local.ts)}
                </span>
                {total > 0 && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: isHot ? '#15803d' : '#c2410c',
                      background: isHot ? '#dcfce7' : '#ffedd5',
                      padding: '3px 10px',
                      borderRadius: 100,
                    }}
                  >
                    {score}% {heatLabel(score).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Heat bar */}
              {total > 0 && (
                <div
                  style={{
                    height: 4,
                    background: 'rgba(0,0,0,0.06)',
                    borderRadius: 2,
                    overflow: 'hidden',
                    marginBottom: 28,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${score}%`,
                      background: isHot
                        ? 'linear-gradient(90deg, #3dffc0, #00d4a0)'
                        : 'linear-gradient(90deg, #ff4d6d, #ff2d52)',
                      borderRadius: 2,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              )}

              {/* AI Headline */}
              {local.aiCard?.headline && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                    border: '1px solid rgba(61,255,192,0.3)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    marginBottom: 24,
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#15803d',
                      marginBottom: 6,
                    }}
                  >
                    ✦ AI Pitch Summary
                  </p>
                  <p
                    style={{
                      fontSize: 16,
                      color: '#0a0a0a',
                      fontWeight: 500,
                      lineHeight: 1.4,
                    }}
                  >
                    {local.aiCard.headline}
                  </p>
                </div>
              )}

              {/* Full description */}
              <div style={{ marginBottom: 24 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(0,0,0,0.35)',
                    marginBottom: 10,
                  }}
                >
                  The Pitch
                </p>
                <p
                  style={{
                    fontSize: 16,
                    color: '#1a1a1a',
                    lineHeight: 1.7,
                  }}
                >
                  {local.desc}
                </p>
              </div>

              {/* AI Insights */}
              {local.aiCard?.insights && local.aiCard.insights.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'rgba(0,0,0,0.35)',
                      marginBottom: 12,
                    }}
                  >
                    Key Insights
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {local.aiCard.insights.map((ins, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                          padding: '10px 14px',
                          background: 'rgba(0,0,0,0.03)',
                          borderRadius: 8,
                          border: '1px solid rgba(0,0,0,0.06)',
                        }}
                      >
                        <span style={{ color: '#3dffc0', fontWeight: 700, marginTop: 1, flexShrink: 0 }}>→</span>
                        <span style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.45 }}>{ins}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VOTE BUTTONS — big, prominent */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 32,
                }}
              >
                {/* Crazy Shit */}
                <button
                  onClick={() => vote('up')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '20px 16px',
                    borderRadius: 16,
                    border: hasUpvoted
                      ? '2px solid #3dffc0'
                      : '2px solid rgba(0,0,0,0.08)',
                    background: hasUpvoted
                      ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
                      : 'rgba(0,0,0,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    transform: hasUpvoted ? 'scale(1.02)' : 'scale(1)',
                  }}
                  onMouseEnter={(e) => {
                    if (!hasUpvoted) {
                      e.currentTarget.style.background = 'rgba(61,255,192,0.06)';
                      e.currentTarget.style.borderColor = 'rgba(61,255,192,0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!hasUpvoted) {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
                      e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                    }
                  }}
                >
                  <span style={{ fontSize: 32 }}>🔥</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: hasUpvoted ? '#15803d' : '#0a0a0a',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Crazy Shit
                  </span>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: hasUpvoted ? '#3dffc0' : 'rgba(0,0,0,0.25)',
                      fontFamily: "'DM Serif Display', serif",
                      lineHeight: 1,
                    }}
                  >
                    {local.upvotes.length}
                  </span>
                </button>

                {/* Dump It */}
                <button
                  onClick={() => vote('down')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '20px 16px',
                    borderRadius: 16,
                    border: hasDownvoted
                      ? '2px solid #ff4d6d'
                      : '2px solid rgba(0,0,0,0.08)',
                    background: hasDownvoted
                      ? 'linear-gradient(135deg, #fff1f2, #ffe4e6)'
                      : 'rgba(0,0,0,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    transform: hasDownvoted ? 'scale(1.02)' : 'scale(1)',
                  }}
                  onMouseEnter={(e) => {
                    if (!hasDownvoted) {
                      e.currentTarget.style.background = 'rgba(255,77,109,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255,77,109,0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!hasDownvoted) {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
                      e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                    }
                  }}
                >
                  <span style={{ fontSize: 32 }}>🗑</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: hasDownvoted ? '#be185d' : '#0a0a0a',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Dump It
                  </span>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: hasDownvoted ? '#ff4d6d' : 'rgba(0,0,0,0.25)',
                      fontFamily: "'DM Serif Display', serif",
                      lineHeight: 1,
                    }}
                  >
                    {local.downvotes.length}
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div
                style={{
                  height: 1,
                  background: 'rgba(0,0,0,0.07)',
                  marginBottom: 28,
                }}
              />

              {/* Comments */}
              <div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(0,0,0,0.35)',
                    marginBottom: 16,
                  }}
                >
                  Comments ({local.comments.length})
                </p>

                {/* Comment list */}
                {local.comments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                    {local.comments.map((c) => (
                      <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: '#3dffc0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#0a0a0b',
                            flexShrink: 0,
                          }}
                        >
                          {initials(c.author)}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#0a0a0a',
                              marginBottom: 3,
                            }}
                          >
                            @{c.author}{' '}
                            <span style={{ fontWeight: 400, color: 'rgba(0,0,0,0.4)' }}>
                              {timeAgo(c.ts)}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              color: 'rgba(0,0,0,0.75)',
                              lineHeight: 1.5,
                            }}
                          >
                            {c.text}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment input */}
                {profile ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && postComment()}
                      placeholder="What do you think? Be brutal."
                      style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.04)',
                        border: '1.5px solid rgba(0,0,0,0.1)',
                        color: '#0a0a0a',
                        borderRadius: 8,
                        padding: '11px 14px',
                        fontSize: 14,
                        outline: 'none',
                        fontFamily: 'Inter, sans-serif',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#3dffc0')}
                      onBlur={(e) => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
                    />
                    <button
                      onClick={postComment}
                      disabled={commenting || !commentText.trim()}
                      style={{
                        padding: '11px 18px',
                        background: '#0a0a0b',
                        color: '#f5f5f0',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: commenting ? 'wait' : 'pointer',
                        opacity: !commentText.trim() ? 0.4 : 1,
                        transition: 'opacity 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Post →
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '14px 18px',
                      background: 'rgba(0,0,0,0.03)',
                      borderRadius: 8,
                      border: '1px solid rgba(0,0,0,0.07)',
                      textAlign: 'center',
                    }}
                  >
                    <a
                      href="/login"
                      style={{
                        color: '#1d4ed8',
                        fontWeight: 600,
                        fontSize: 14,
                        textDecoration: 'none',
                      }}
                    >
                      Log in to vote & comment →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
