import { Video } from '@/types/music';

const FAVORITES_KEY = 'cmusic_favorites';
const HISTORY_KEY = 'cmusic_history';
const STATS_KEY = 'cmusic_stats';
const ARTISTS_KEY = 'cmusic_artists';
const ARTISTS_DATA_KEY = 'cmusic_artists_data'; // New key for artist objects
const USERNAME_KEY = 'cmusic_username';
const ONBOARDING_KEY = 'cmusic_onboarded';
const DOWNLOADS_KEY = 'cmusic_downloads';
const SETTINGS_KEY = 'cmusic_settings';
const ARTIST_CHANNELS_KEY = 'cmusic_artist_channels'; // New key for artist channels

// User Settings
export interface UserSettings {
  theme: 'dark' | 'dynamic' | 'light';
  dynamicThemeIntensity: number;
  autoPlay: boolean;
  crossfade: boolean;
  showLyrics: boolean;
  downloadQuality: 'low' | 'medium' | 'high';
  recommendationAlgorithm: 'personalized' | 'mixed' | 'exploration';
  defaultQuickPickMode: 'mashup' | 'last-played' | 'most-played';
}

const defaultSettings: UserSettings = {
  theme: 'dynamic',
  dynamicThemeIntensity: 0.5,
  autoPlay: true,
  crossfade: false,
  showLyrics: true,
  downloadQuality: 'high',
  recommendationAlgorithm: 'personalized',
  defaultQuickPickMode: 'mashup',
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
  path?: string;
  format?: string;
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
  
  // Update stats and track artist plays
  incrementPlayCount(video);
  updateArtistPlayCount(video.author);
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
  lastPlayed?: Video;
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
  stats.lastPlayed = video;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

// Artist Data Interface
export interface ArtistData {
  id?: string;
  name: string;
  genre?: string;
  channelId?: string;
  thumbnail?: string;
  selectedAt?: number;
  playCount?: number;
  lastPlayed?: number;
}

// Artist Channels
export interface ArtistChannel {
  id: string;
  name: string;
  thumbnail: string;
  description?: string;
  subscriberCount?: string;
  videoCount?: number;
  lastUpdated: number;
}

// Preferred Artists with full data
export function getPreferredArtists(): ArtistData[] {
  try {
    const stored = localStorage.getItem(ARTISTS_DATA_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function setPreferredArtists(artists: ArtistData[]): void {
  localStorage.setItem(ARTISTS_DATA_KEY, JSON.stringify(artists));
  
  // Also maintain the simple string array for compatibility
  const artistNames = artists.map(a => a.name);
  localStorage.setItem(ARTISTS_KEY, JSON.stringify(artistNames));
}

export function addPreferredArtist(artist: ArtistData): void {
  const artists = getPreferredArtists();
  const existingIndex = artists.findIndex(a => a.name === artist.name);
  
  if (existingIndex >= 0) {
    // Update existing artist
    artists[existingIndex] = {
      ...artists[existingIndex],
      ...artist,
      selectedAt: artist.selectedAt || artists[existingIndex].selectedAt || Date.now()
    };
  } else {
    // Add new artist
    artists.push({
      ...artist,
      selectedAt: artist.selectedAt || Date.now(),
      playCount: artist.playCount || 0
    });
  }
  
  setPreferredArtists(artists);
}

export function removePreferredArtist(artistName: string): void {
  const artists = getPreferredArtists().filter(a => a.name !== artistName);
  setPreferredArtists(artists);
}

export function updateArtistPlayCount(artistName: string): void {
  const artists = getPreferredArtists();
  const artistIndex = artists.findIndex(a => a.name === artistName);
  
  if (artistIndex >= 0) {
    artists[artistIndex] = {
      ...artists[artistIndex],
      playCount: (artists[artistIndex].playCount || 0) + 1,
      lastPlayed: Date.now()
    };
    setPreferredArtists(artists);
  }
}

export function getArtistPlayCount(artistName: string): number {
  const artists = getPreferredArtists();
  const artist = artists.find(a => a.name === artistName);
  return artist?.playCount || 0;
}

export function hasSelectedArtists(): boolean {
  return getPreferredArtists().length > 0;
}

// Artist Channels Cache
export function getArtistChannel(channelId: string): ArtistChannel | null {
  try {
    const stored = localStorage.getItem(ARTIST_CHANNELS_KEY);
    if (!stored) return null;
    
    const channels: Record<string, ArtistChannel> = JSON.parse(stored);
    return channels[channelId] || null;
  } catch {
    return null;
  }
}

export function cacheArtistChannel(channel: ArtistChannel): void {
  try {
    const stored = localStorage.getItem(ARTIST_CHANNELS_KEY);
    const channels: Record<string, ArtistChannel> = stored ? JSON.parse(stored) : {};
    
    channels[channel.id] = {
      ...channel,
      lastUpdated: Date.now()
    };
    
    localStorage.setItem(ARTIST_CHANNELS_KEY, JSON.stringify(channels));
  } catch (error) {
    console.error('Failed to cache artist channel:', error);
  }
}

export function getCachedArtistChannels(): ArtistChannel[] {
  try {
    const stored = localStorage.getItem(ARTIST_CHANNELS_KEY);
    if (!stored) return [];
    
    const channels: Record<string, ArtistChannel> = JSON.parse(stored);
    return Object.values(channels);
  } catch {
    return [];
  }
}

// Recommendation Algorithm Helper
export function getRecommendationWeights() {
  const settings = getSettings();
  const preferredArtists = getPreferredArtists();
  const stats = getStats();
  const history = getHistory();
  
  let artistWeight = 0.4;
  let historyWeight = 0.3;
  let statsWeight = 0.2;
  let explorationWeight = 0.1;
  
  switch (settings.recommendationAlgorithm) {
    case 'personalized':
      artistWeight = 0.5;
      historyWeight = 0.3;
      statsWeight = 0.2;
      explorationWeight = 0;
      break;
    case 'mixed':
      artistWeight = 0.3;
      historyWeight = 0.3;
      statsWeight = 0.2;
      explorationWeight = 0.2;
      break;
    case 'exploration':
      artistWeight = 0.1;
      historyWeight = 0.2;
      statsWeight = 0.2;
      explorationWeight = 0.5;
      break;
  }
  
  // Adjust weights based on available data
  if (preferredArtists.length === 0) {
    artistWeight = 0;
    explorationWeight += 0.1;
    historyWeight += 0.1;
  }
  
  if (history.length === 0) {
    historyWeight = 0;
    artistWeight += historyWeight / 2;
    explorationWeight += historyWeight / 2;
  }
  
  if (stats.totalPlays === 0) {
    statsWeight = 0;
    artistWeight += statsWeight / 2;
    explorationWeight += statsWeight / 2;
  }
  
  return {
    artistWeight,
    historyWeight,
    statsWeight,
    explorationWeight
  };
}

// Get personalized greeting
export function getGreeting(): string {
  const hour = new Date().getHours();
  const name = getUsername();
  
  let greeting = '';
  if (hour < 12) {
    greeting = 'Good morning';
  } else if (hour < 18) {
    greeting = 'Good afternoon';
  } else {
    greeting = 'Good evening';
  }
  
  if (name) {
    return `${greeting}, ${name} 👋`;
  }
  
  return greeting;
}

// Get personalized greeting with emoji
export function getPersonalizedGreeting(): string {
  const hour = new Date().getHours();
  const name = getUsername();
  const emojis = ['🎵', '🎶', '🎧', '🎸', '🎤', '🥁', '🎹', '🎷'];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  
  let greeting = '';
  if (hour < 5) {
    greeting = 'Late night vibes';
  } else if (hour < 12) {
    greeting = 'Good morning';
  } else if (hour < 17) {
    greeting = 'Good afternoon';
  } else if (hour < 22) {
    greeting = 'Good evening';
  } else {
    greeting = 'Night owl mode';
  }
  
  if (name) {
    return `${greeting}, ${name} ${randomEmoji}`;
  }
  
  return `${greeting} ${randomEmoji}`;
}

// Get welcome back message
export function getWelcomeBackMessage(): string {
  const name = getUsername();
  const artists = getPreferredArtists();
  const history = getHistory();
  
  if (history.length > 0) {
    const lastPlayed = history[0];
    if (name) {
      return `Welcome back, ${name}! Last played: ${lastPlayed.title} 🎶`;
    }
    return `Welcome back! Last played: ${lastPlayed.title} 🎶`;
  }
  
  if (artists.length > 0) {
    const randomArtist = artists[Math.floor(Math.random() * artists.length)];
    if (name) {
      return `Welcome back, ${name}! Ready for some ${randomArtist.name}? 🎵`;
    }
    return `Welcome back! Ready for some ${randomArtist.name}? 🎵`;
  }
  
  if (name) {
    return `Welcome back, ${name}! 🎶`;
  }
  
  return 'Welcome back! 🎶';
}

// Clear all user data
export function clearUserData(): void {
  localStorage.removeItem(FAVORITES_KEY);
  localStorage.removeItem(HISTORY_KEY);
  localStorage.removeItem(STATS_KEY);
  localStorage.removeItem(ARTISTS_KEY);
  localStorage.removeItem(ARTISTS_DATA_KEY);
  localStorage.removeItem(ARTIST_CHANNELS_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(ONBOARDING_KEY);
  localStorage.removeItem(DOWNLOADS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
}

// Export preferences for backup
export function exportPreferences(): string {
  const preferences = {
    username: getUsername(),
    preferredArtists: getPreferredArtists(),
    settings: getSettings(),
    favoritesCount: getFavorites().length,
    historyCount: getHistory().length,
    stats: getStats(),
    downloadCount: getDownloads().length,
    exportDate: new Date().toISOString()
  };
  
  return JSON.stringify(preferences, null, 2);
}
