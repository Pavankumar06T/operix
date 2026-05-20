import { formatDistanceToNow } from 'date-fns';

export function getRiskColor(score: number): string {
  if (score >= 71) return '#EF4444';
  if (score >= 41) return '#F59E0B';
  return '#22C55E';
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || '?').toUpperCase();
}

const AVATAR_COLORS = ['#4F6EF7', '#A855F7', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4'];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatRelativeTime(date: string): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

export function getWorkloadColor(percent: number): string {
  if (percent > 85) return '#EF4444';
  if (percent >= 60) return '#F59E0B';
  return '#22C55E';
}

export function getDeadlineColor(deadline: string): string {
  const now = new Date();
  const dl = new Date(deadline);
  const daysLeft = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 3) return '#EF4444';
  if (daysLeft < 7) return '#F59E0B';
  return '#9898B0';
}
