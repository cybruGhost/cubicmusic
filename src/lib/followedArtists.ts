const FOLLOWED_ARTISTS_KEY = 'cmusic_followed_artists';
const SAVED_ALBUMS_KEY = 'cmusic_saved_albums';

export interface FollowedArtist {
  name: string;
  channelId?: string;
  thumbnail?: string;
  followedAt: number;
}

export interface SavedAlbum {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  videoIds: string[];
  savedAt: number;
}

// Followed Artists
export function getFollowedArtists(): FollowedArtist[] {
  try {
    const stored = localStorage.getItem(FOLLOWED_ARTISTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function followArtist(artist: FollowedArtist): void {
  const artists = getFollowedArtists().filter(a => a.name !== artist.name);
  artists.unshift({ ...artist, followedAt: Date.now() });
  localStorage.setItem(FOLLOWED_ARTISTS_KEY, JSON.stringify(artists));
}

export function unfollowArtist(artistName: string): void {
  const artists = getFollowedArtists().filter(a => a.name !== artistName);
  localStorage.setItem(FOLLOWED_ARTISTS_KEY, JSON.stringify(artists));
}

export function isFollowingArtist(artistName: string): boolean {
  return getFollowedArtists().some(a => a.name === artistName);
}

// Saved Albums
export function getSavedAlbums(): SavedAlbum[] {
  try {
    const stored = localStorage.getItem(SAVED_ALBUMS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveAlbum(album: SavedAlbum): void {
  const albums = getSavedAlbums().filter(a => a.id !== album.id);
  albums.unshift({ ...album, savedAt: Date.now() });
  localStorage.setItem(SAVED_ALBUMS_KEY, JSON.stringify(albums));
}

export function removeAlbum(albumId: string): void {
  const albums = getSavedAlbums().filter(a => a.id !== albumId);
  localStorage.setItem(SAVED_ALBUMS_KEY, JSON.stringify(albums));
}

export function isAlbumSaved(albumId: string): boolean {
  return getSavedAlbums().some(a => a.id === albumId);
}
