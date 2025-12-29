import { Video } from '@/types/music';

const FAVORITES_KEY = 'cmusic_favorites';
const HISTORY_KEY = 'cmusic_history';
const STATS_KEY = 'cmusic_stats';
const ARTISTS_KEY = 'cmusic_artists';
const USERNAME_KEY = 'cmusic_username';
const ONBOARDING_KEY = 'cmusic_onboarded';
const DOWNLOADS_KEY = 'cmusic_downloads';
const SETTINGS_KEY = 'cmusic_settings';

// User Settings
export interface UserSettings {
  theme: 'dark' | 'dynamic';
  dynamicThemeIntensity: number;
  autoPlay: boolean;
  crossfade: boolean;
  showLyrics: boolean;
  downloadQuality: 'low' | 'medium' | 'high';
}

const defaultSettings: UserSettings = {
  theme: 'dynamic',
  dynamicThemeIntensity: 0.5,
  autoPlay: true,
  crossfade: false,
  showLyrics: true,
  downloadQuality: 'high',
};

export function getSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: Partial<UserSettings>): void {
  const current = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
}

// Username
export function getUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY);
}

export function setUsername(name: string): void {
  localStorage.setItem(USERNAME_KEY, name);
}

// Onboarding
export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function setOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

// Downloads
export interface DownloadedTrack {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  downloadedAt: number;
  size?: number;
}

export function getDownloads(): DownloadedTrack[] {
  try {
    const stored = localStorage.getItem(DOWNLOADS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addDownload(track: DownloadedTrack): void {
  const downloads = getDownloads().filter(d => d.videoId !== track.videoId);
  downloads.unshift(track);
  localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads.slice(0, 200)));
}

export function removeDownload(videoId: string): void {
  const downloads = getDownloads().filter(d => d.videoId !== videoId);
  localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));
}

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

// Get greeting based on time
export function getGreeting(): string {
  const hour = new Date().getHours();
  const name = getUsername();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${greeting}, ${name}` : greeting;
}
