/**
 * JULO moods — colored chips that tag every post.
 * Used by composer, post card, and explore filter.
 */
export const MOODS = [
  { id: "hyped", label: "Hyped", emoji: "🔥", color: "var(--mood-hyped)", tone: "red" },
  { id: "cozy", label: "Cozy", emoji: "🌿", color: "var(--mood-cozy)", tone: "yellow" },
  { id: "salty", label: "Salty", emoji: "🧂", color: "var(--mood-salty)", tone: "blue" },
  { id: "curious", label: "Curious", emoji: "🔍", color: "var(--mood-curious)", tone: "pink" },
  { id: "hottake", label: "Hot take", emoji: "🌶️", color: "var(--mood-hottake)", tone: "red" },
  { id: "soft", label: "Soft", emoji: "🫧", color: "var(--mood-soft)", tone: "pink" },
];

export const MOOD_BY_ID = Object.fromEntries(MOODS.map((m) => [m.id, m]));

/**
 * Pick a stable pseudo-mood for posts the backend hasn't tagged yet.
 * Hash the post id so the same post always shows the same mood.
 */
export function moodForPost(post) {
  if (!post) return null;
  if (post.mood && MOOD_BY_ID[post.mood]) return MOOD_BY_ID[post.mood];
  const seed = String(post._id || post.id || "");
  if (!seed) return null;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return MOODS[Math.abs(h) % MOODS.length];
}
