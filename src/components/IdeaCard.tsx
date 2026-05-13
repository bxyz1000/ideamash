'use client';

import { useState } from 'react';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { heatScore, heatLabel, categoryBg, timeAgo, initials } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  author: string;
  text: string;
  ts: number;
}

interface Idea {
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

interface IdeaCardProps {
  idea: Idea;
  variant?: 'dark' | 'light';
  rank?: number;
  onCardClick?: (idea: Idea) => void;
}

export default function IdeaCard({ idea, variant = 'dark', rank, onCardClick }: IdeaCardProps) {
  const { profile } = useAuth();
  const [localIdea, setLocalIdea] = useState(idea);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  const isDark = variant === 'dark';
  const score = heatScore(localIdea.upvotes, localIdea.downvotes);
  const isHot = score >= 50;
  const username = profile?.username || '';
  const hasUpvoted = localIdea.upvotes.includes(username);
  const hasDownvoted = localIdea.downvotes.includes(username);

  const bg = isDark ? '#111114' : '#ffffff';
  const textPrimary = isDark ? '#f5f5f0' : '#0a0a0b';
  const textSecondary = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const vote = async (type: 'up' | 'down') => {
    if (!profile) {
      toast.error('Log in to vote');
      return;
    }

    const ideaRef = doc(db, 'ideas', localIdea.id);
    let newUpvotes = [...localIdea.upvotes];
    let newDownvotes = [...localIdea.downvotes];

    if (type === 'up') {
      if (hasUpvoted) {
        newUpvotes = newUpvotes.filter((u) => u !== username);
        await updateDoc(ideaRef, { upvotes: arrayRemove(username) });
      } else {
        newUpvotes.push(username);
        newDownvotes = newDownvotes.filter((u) => u !== username);
        await updateDoc(ideaRef, {
          upvotes: arrayUnion(username),
          downvotes: arrayRemove(username),
        });
        toast.success('🔥 Crazy shit!');
      }
    } else {
      if (hasDownvoted) {
        newDownvotes = newDownvotes.filter((u) => u !== username);
        await updateDoc(ideaRef, { downvotes: arrayRemove(username) });
      } else {
        newDownvotes.push(username);
        newUpvotes = newUpvotes.filter((u) => u !== username);
        await updateDoc(ideaRef, {
          downvotes: arrayUnion(username),
          upvotes: arrayRemove(username),
        });
        toast('🗑 Dumped it.');
      }
    }

    setLocalIdea({ ...localIdea, upvotes: newUpvotes, downvotes: newDownvotes });
  };

  const postComment = async () => {
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
      const ideaRef = doc(db, 'ideas', localIdea.id);
      await updateDoc(ideaRef, { comments: arrayUnion(newComment) });
      setLocalIdea({ ...localIdea, comments: [...localIdea.comments, newComment] });
      setCommentText('');
      toast.success('Comment posted!');
    } finally {
      setCommenting(false);
    }
  };

  const copyShare = () => {
    const text = `"${localIdea.title}" — ${localIdea.aiCard?.headline || localIdea.desc.slice(0, 80)} | Vote on IdeaMash: https://ideamash.vercel.app`;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard ↗');
  };

  return (
    <div
      className="idea-card"
      onClick={() => onCardClick?.(localIdea)}
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        position: 'relative',
        cursor: onCardClick ? 'pointer' : 'default',
      }}
    >
      {/* Rank badge */}
      {rank !== undefined && (
        <div
          style={{
            position: 'absolute',
            top: -1,
            left: 20,
            background: '#3dffc0',
            color: '#0a0a0b',
            fontWeight: 900,
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: '0 0 6px 6px',
            letterSpacing: '0.06em',
          }}
        >
          #{rank + 1}
        </div>
      )}

      {/* Top row: category + heat */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: rank !== undefined ? 10 : 0 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '3px 10px',
            borderRadius: 4,
            border: '1px solid',
          }}
          className={isDark ? categoryBg(localIdea.category) : categoryBg(localIdea.category)}
        >
          {localIdea.category}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: isHot ? '#3dffc0' : '#ff4d6d',
              fontFamily: 'DM Serif Display, serif',
              lineHeight: 1,
            }}
          >
            {score}%
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: isHot ? '#3dffc0' : '#ff4d6d',
              opacity: 0.85,
            }}
          >
            {heatLabel(score)}
          </span>
        </div>
      </div>

      {/* Heat bar */}
      <div
        style={{
          height: 3,
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          className="heat-bar-fill"
          style={{
            height: '100%',
            width: `${score}%`,
            background: isHot
              ? 'linear-gradient(90deg, #3dffc0, #00d4a0)'
              : 'linear-gradient(90deg, #ff4d6d, #ff2d52)',
            borderRadius: 2,
          }}
        />
      </div>

      {/* Title */}
      <div>
        <h3
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 20,
            fontWeight: 400,
            color: textPrimary,
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
            marginBottom: localIdea.aiCard?.headline ? 6 : 0,
          }}
        >
          {localIdea.title}
        </h3>
        {localIdea.aiCard?.headline && (
          <p style={{ fontSize: 13, color: textSecondary, lineHeight: 1.4 }}>
            {localIdea.aiCard.headline}
          </p>
        )}
      </div>

      {/* AI Insights */}
      {localIdea.aiCard?.insights && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {localIdea.aiCard.insights.map((insight, i) => (
            <div
              key={i}
              style={{
                fontSize: 12,
                color: textSecondary,
                display: 'flex',
                gap: 6,
                alignItems: 'flex-start',
              }}
            >
              <span style={{ color: '#3dffc0', marginTop: 1, flexShrink: 0 }}>→</span>
              {insight}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          paddingTop: 6,
          borderTop: `1px solid ${borderColor}`,
        }}
      >
        {/* Upvote */}
        <button
          onClick={() => vote('up')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '7px 12px',
            borderRadius: 6,
            border: `1px solid ${hasUpvoted ? 'rgba(61,255,192,0.4)' : borderColor}`,
            background: hasUpvoted ? 'rgba(61,255,192,0.08)' : 'transparent',
            color: hasUpvoted ? '#3dffc0' : textSecondary,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          🔥 {localIdea.upvotes.length}
        </button>

        {/* Downvote */}
        <button
          onClick={() => vote('down')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '7px 12px',
            borderRadius: 6,
            border: `1px solid ${hasDownvoted ? 'rgba(255,77,109,0.4)' : borderColor}`,
            background: hasDownvoted ? 'rgba(255,77,109,0.08)' : 'transparent',
            color: hasDownvoted ? '#ff4d6d' : textSecondary,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          🗑 {localIdea.downvotes.length}
        </button>

        {/* Comments */}
        <button
          onClick={() => setCommentOpen(!commentOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '7px 12px',
            borderRadius: 6,
            border: `1px solid ${commentOpen ? 'rgba(255,255,255,0.25)' : borderColor}`,
            background: commentOpen ? 'rgba(255,255,255,0.05)' : 'transparent',
            color: textSecondary,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          💬 {localIdea.comments.length}
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Author */}
        <span style={{ fontSize: 12, color: textSecondary }}>
          @{localIdea.author} · {timeAgo(localIdea.ts)}
        </span>

        {/* Share */}
        <button
          onClick={copyShare}
          style={{
            padding: '7px 10px',
            borderRadius: 6,
            border: `1px solid ${borderColor}`,
            background: 'transparent',
            color: textSecondary,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          title="Share"
        >
          ↗
        </button>
      </div>

      {/* Comments section */}
      {commentOpen && (
        <div className="comment-box" style={{ borderTop: `1px solid ${borderColor}` }}>
          {/* Existing comments */}
          {localIdea.comments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
              {localIdea.comments.map((c) => (
                <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#3dffc0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#0a0a0b',
                      flexShrink: 0,
                    }}
                  >
                    {initials(c.author)}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: textPrimary, marginBottom: 2 }}>
                      @{c.author}{' '}
                      <span style={{ fontWeight: 400, color: textSecondary }}>{timeAgo(c.ts)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.75)', lineHeight: 1.4 }}>
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
                placeholder="Add a comment..."
                style={{
                  flex: 1,
                  background: inputBg,
                  border: `1px solid ${inputBorder}`,
                  color: textPrimary,
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
              <button
                onClick={postComment}
                disabled={commenting || !commentText.trim()}
                style={{
                  padding: '8px 14px',
                  background: '#3dffc0',
                  color: '#0a0a0b',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: commenting ? 'wait' : 'pointer',
                  opacity: !commentText.trim() ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                Post
              </button>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: textSecondary }}>
              <a href="/login" style={{ color: '#3dffc0' }}>Log in</a> to comment
            </p>
          )}
        </div>
      )}
    </div>
  );
}
