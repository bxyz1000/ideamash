import { formatDistanceToNow } from 'date-fns';

export function timeAgo(ts: number | Date): string {
  try {
    const date = typeof ts === 'number' ? new Date(ts) : ts;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'some time ago';
  }
}

export function heatScore(upvotes: string[], downvotes: string[]): number {
  const total = upvotes.length + downvotes.length;
  if (total === 0) return 0;
  return Math.round((upvotes.length / total) * 100);
}

export function heatLabel(score: number): string {
  return score >= 50 ? 'crazy shit' : 'dump it';
}

export function categoryColor(category: string): string {
  const colors: Record<string, string> = {
    AI: '#3dffc0',
    Marketplace: '#ff9f43',
    B2B: '#4a9eff',
    Consumer: '#ff6b9d',
    SaaS: '#a29bfe',
    Hardware: '#fdcb6e',
    Other: '#b2bec3',
  };
  return colors[category] || '#b2bec3';
}

export function categoryBg(category: string): string {
  const bgs: Record<string, string> = {
    AI: 'bg-[#3dffc0]/10 text-[#3dffc0] border-[#3dffc0]/30',
    Marketplace: 'bg-[#ff9f43]/10 text-[#ff9f43] border-[#ff9f43]/30',
    B2B: 'bg-[#4a9eff]/10 text-[#4a9eff] border-[#4a9eff]/30',
    Consumer: 'bg-[#ff6b9d]/10 text-[#ff6b9d] border-[#ff6b9d]/30',
    SaaS: 'bg-[#a29bfe]/10 text-[#a29bfe] border-[#a29bfe]/30',
    Hardware: 'bg-[#fdcb6e]/10 text-[#fdcb6e] border-[#fdcb6e]/30',
    Other: 'bg-white/5 text-white/50 border-white/10',
  };
  return bgs[category] || 'bg-white/5 text-white/50 border-white/10';
}

export function categoryBgLight(category: string): string {
  const bgs: Record<string, string> = {
    AI: 'bg-[#3dffc0]/10 text-[#0a8a60] border-[#3dffc0]/40',
    Marketplace: 'bg-[#ff9f43]/10 text-[#c47a1a] border-[#ff9f43]/40',
    B2B: 'bg-[#4a9eff]/10 text-[#1a6ac4] border-[#4a9eff]/40',
    Consumer: 'bg-[#ff6b9d]/10 text-[#c41a50] border-[#ff6b9d]/40',
    SaaS: 'bg-[#a29bfe]/10 text-[#5a52c4] border-[#a29bfe]/40',
    Hardware: 'bg-[#fdcb6e]/10 text-[#a07c1a] border-[#fdcb6e]/40',
    Other: 'bg-black/5 text-black/50 border-black/10',
  };
  return bgs[category] || 'bg-black/5 text-black/50 border-black/10';
}

const PFP_COLORS = [
  '#3dffc0', '#ff4d6d', '#4a9eff', '#ff9f43', '#a29bfe',
  '#fdcb6e', '#00cec9', '#fd79a8', '#6c5ce7', '#00b894',
];

export function randomPfpColor(): string {
  return PFP_COLORS[Math.floor(Math.random() * PFP_COLORS.length)];
}

export function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

export function validateUsername(username: string): string | null {
  if (!username) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 20) return 'Username must be at most 20 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Only letters, numbers and underscores allowed';
  return null;
}
