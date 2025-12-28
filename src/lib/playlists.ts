import { UserPlaylist, Video } from '@/types/music';

const STORAGE_KEY = 'cubic_playlists';

export function getPlaylists(): UserPlaylist[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function savePlaylist(playlist: UserPlaylist): void {
  const playlists = getPlaylists();
  const existingIndex = playlists.findIndex(p => p.id === playlist.id);
  
  if (existingIndex >= 0) {
    playlists[existingIndex] = { ...playlist, updatedAt: Date.now() };
  } else {
    playlists.push(playlist);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
}

export function deletePlaylist(playlistId: string): void {
  const playlists = getPlaylists().filter(p => p.id !== playlistId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
}

export function createPlaylist(name: string, description?: string): UserPlaylist {
  const playlist: UserPlaylist = {
    id: `pl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    tracks: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  savePlaylist(playlist);
  return playlist;
}

export function addTrackToPlaylist(playlistId: string, track: Video): void {
  const playlists = getPlaylists();
  const playlist = playlists.find(p => p.id === playlistId);
  
  if (playlist) {
    // Avoid duplicates
    if (!playlist.tracks.some(t => t.videoId === track.videoId)) {
      playlist.tracks.push(track);
      playlist.thumbnail = playlist.thumbnail || getThumbnailUrl(track);
      savePlaylist(playlist);
    }
  }
}

export function removeTrackFromPlaylist(playlistId: string, videoId: string): void {
  const playlists = getPlaylists();
  const playlist = playlists.find(p => p.id === playlistId);
  
  if (playlist) {
    playlist.tracks = playlist.tracks.filter(t => t.videoId !== videoId);
    savePlaylist(playlist);
  }
}

function getThumbnailUrl(video: Video): string {
  const thumb = video.videoThumbnails?.find(t => t.width >= 120) || video.videoThumbnails?.[0];
  if (!thumb) return '';
  return thumb.url.startsWith('//') ? `https:${thumb.url}` : thumb.url;
}

// Import playlist from YouTube URL
export async function importPlaylistFromUrl(url: string): Promise<{ name: string; videos: Video[] } | null> {
  try {
    // Extract playlist ID from URL
    const match = url.match(/[?&]list=([^&]+)/);
    if (!match) return null;
    
    const playlistId = match[1];
    const response = await fetch(`https://yt.omada.cafe/api/v1/playlists/${playlistId}`);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    const videos: Video[] = (data.videos || []).map((v: any) => ({
      type: 'video' as const,
      title: v.title,
      videoId: v.videoId,
      author: v.author,
      authorId: v.authorId || '',
      authorUrl: v.authorUrl || '',
      videoThumbnails: v.videoThumbnails || [],
      description: '',
      viewCount: 0,
      published: 0,
      publishedText: '',
      lengthSeconds: v.lengthSeconds || 0,
      liveNow: false,
      premium: false,
      isUpcoming: false,
    }));
    
    return {
      name: data.title || 'Imported Playlist',
      videos,
    };
  } catch (error) {
    console.error('Error importing playlist:', error);
    return null;
  }
}
