import { Video } from '@/types/music';

const FAVORITES_KEY = 'cmusic_favorites';
const HISTORY_KEY = 'cmusic_history';
const STATS_KEY = 'cmusic_stats';
const ARTISTS_KEY = 'cmusic_artists';

// Favorites
export function getFavorites(): Video[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addFavorite(video: Video): void {
  const favorites = getFavorites();
  if (!favorites.some(f => f.videoId === video.videoId)) {
    favorites.unshift(video);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.slice(0, 500)));
  }
}

export function removeFavorite(videoId: string): void {
  const favorites = getFavorites().filter(f => f.videoId !== videoId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export function isFavorite(videoId: string): boolean {
  return getFavorites().some(f => f.videoId === videoId);
}

// History
export function getHistory(): Video[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToHistory(video: Video): void {
  const history = getHistory().filter(h => h.videoId !== video.videoId);
  history.unshift(video);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
  
  // Update stats
  incrementPlayCount(video);
}

export function clearHistory(): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
}

// Stats
interface PlayStats {
  totalPlays: number;
  topTracks: { videoId: string; title: string; author: string; plays: number }[];
  topArtists: { name: string; plays: number }[];
  lastUpdated: number;
}

export function getStats(): PlayStats {
  try {
    const stored = localStorage.getItem(STATS_KEY);
    return stored ? JSON.parse(stored) : {
      totalPlays: 0,
      topTracks: [],
      topArtists: [],
      lastUpdated: Date.now()
    };
  } catch {
    return { totalPlays: 0, topTracks: [], topArtists: [], lastUpdated: Date.now() };
  }
}

function incrementPlayCount(video: Video): void {
  const stats = getStats();
  stats.totalPlays++;
  
  // Update top tracks
  const trackIndex = stats.topTracks.findIndex(t => t.videoId === video.videoId);
  if (trackIndex >= 0) {
    stats.topTracks[trackIndex].plays++;
  } else {
    stats.topTracks.push({
      videoId: video.videoId,
      title: video.title,
      author: video.author,
      plays: 1
    });
  }
  stats.topTracks.sort((a, b) => b.plays - a.plays);
  stats.topTracks = stats.topTracks.slice(0, 50);
  
  // Update top artists
  const artistIndex = stats.topArtists.findIndex(a => a.name === video.author);
  if (artistIndex >= 0) {
    stats.topArtists[artistIndex].plays++;
  } else {
    stats.topArtists.push({ name: video.author, plays: 1 });
  }
  stats.topArtists.sort((a, b) => b.plays - a.plays);
  stats.topArtists = stats.topArtists.slice(0, 30);
  
  stats.lastUpdated = Date.now();
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

// Preferred Artists
export function getPreferredArtists(): string[] {
  try {
    const stored = localStorage.getItem(ARTISTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function setPreferredArtists(artists: string[]): void {
  localStorage.setItem(ARTISTS_KEY, JSON.stringify(artists));
}

export function hasSelectedArtists(): boolean {
  return getPreferredArtists().length > 0;
}
