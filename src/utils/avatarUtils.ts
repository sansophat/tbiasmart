import React from 'react';

// Palette of background colors for initial avatars
const AVATAR_BG_COLORS = [
  '#4f46e5', // indigo-600
  '#2563eb', // blue-600
  '#0d9488', // teal-600
  '#059669', // emerald-600
  '#7c3aed', // violet-600
  '#c026d3', // fuchsia-600
  '#db2777', // pink-600
  '#ea580c', // orange-600
  '#475569', // slate-600
];

/**
 * Pick a consistent background color based on the person's name or code
 */
function getBgColorForString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_BG_COLORS.length;
  return AVATAR_BG_COLORS[index];
}

/**
 * Extracts a clean 1-2 character initial from a name string (handles English and Khmer)
 */
export function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'S';
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    const first = words[0].charAt(0);
    const second = words[words.length - 1].charAt(0);
    return (first + second).toUpperCase();
  }
  return trimmed.slice(0, 1).toUpperCase() || 'S';
}

/**
 * Generates an indestructible inline SVG data URI avatar with the employee's initial.
 * Does not require external internet connection, never 404s, never fails CORS.
 */
export function getFallbackAvatar(name: string = 'Staff', customBg?: string): string {
  const initial = getInitials(name);
  const bg = customBg || getBgColorForString(name);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='${bg}'/><text x='50' y='64' font-family='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' font-size='${initial.length > 1 ? 40 : 46}' font-weight='700' fill='#ffffff' text-anchor='middle'>${encodeURIComponent(initial)}</text></svg>`;
  return `data:image/svg+xml;utf8,${svg}`;
}

export const DEFAULT_AVATAR = getFallbackAvatar('Staff', '#4f46e5');

/**
 * Resolves avatar with cascade: candidate 1 -> candidate 2 -> inline SVG initial avatar.
 * Ignores expired blob URLs.
 */
export function resolveAvatar(
  primary?: string | null,
  secondary?: string | null,
  nameForFallback: string = 'Staff'
): string {
  if (primary && typeof primary === 'string' && primary.trim() && !primary.startsWith('blob:')) {
    return primary.trim();
  }
  if (secondary && typeof secondary === 'string' && secondary.trim() && !secondary.startsWith('blob:')) {
    return secondary.trim();
  }
  return getFallbackAvatar(nameForFallback);
}

/**
 * Universal safe avatar onError handler.
 * Prevents infinite loop and replaces broken images with clean initial avatar.
 */
export function handleAvatarError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  name: string = 'Staff'
): void {
  const img = e.currentTarget;
  img.onerror = null; // Prevent loop
  img.src = getFallbackAvatar(name);
}
