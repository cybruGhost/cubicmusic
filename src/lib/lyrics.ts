import { LyricsData } from '@/types/music';

const SIMPMUSIC_API = 'https://api-lyrics.simpmusic.org/v1';
const LRCLIB_API = 'https://lrclib.net/api';
const LYRICS_OVH_API = 'https://api.lyrics.ovh/v1';

interface LrcLibResponse {
  syncedLyrics?: string;
  plainLyrics?: string;
  trackName?: string;
  artistName?: string;
}

// Fetch from SimpMusic API (primary - supports synced lyrics)
async function fetchFromSimpMusic(videoId: string): Promise<LyricsData | null> {
  try {
    console.log('[Lyrics] Fetching from SimpMusic for videoId:', videoId);
    const response = await fetch(`${SIMPMUSIC_API}/${videoId}?limit=10`);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      // Prioritize synced lyrics
      const sorted = [...data.data].sort((a: any, b: any) => {
        if (a.syncedLyrics && !b.syncedLyrics) return -1;
        if (!a.syncedLyrics && b.syncedLyrics) return 1;
        return 0;
      });
      
      const best = sorted[0];
      console.log('[Lyrics] Successfully fetched from SimpMusic');
      return {
        syncedLyrics: best.syncedLyrics || undefined,
        plainLyrics: best.plainLyrics || undefined,
        source: 'SimpMusic',
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Lyrics] SimpMusic fetch error:', error);
    return null;
  }
}

// Fetch from LrcLib API (secondary - supports synced lyrics)
async function fetchFromLrcLib(trackName: string, artistName: string): Promise<LyricsData | null> {
  try {
    console.log('[Lyrics] Fetching from LrcLib:', trackName, 'by', artistName);
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
    });
    
    const response = await fetch(`${LRCLIB_API}/get?${params}`);
    if (!response.ok) return null;
    
    const data: LrcLibResponse = await response.json();
    
    if (data.syncedLyrics || data.plainLyrics) {
      console.log('[Lyrics] Successfully fetched from LrcLib');
      return {
        syncedLyrics: data.syncedLyrics || undefined,
        plainLyrics: data.plainLyrics || undefined,
        source: 'LrcLib',
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Lyrics] LrcLib fetch error:', error);
    return null;
  }
}

// Fetch from lyrics.ovh API (tertiary - plain lyrics only)
async function fetchFromLyricsOvh(trackName: string, artistName: string): Promise<LyricsData | null> {
  try {
    console.log('[Lyrics] Fetching from lyrics.ovh:', trackName, 'by', artistName);
    
    const response = await fetch(
      `${LYRICS_OVH_API}/${encodeURIComponent(artistName)}/${encodeURIComponent(trackName)}`
    );
    
    if (!response.ok) {
      console.log('[Lyrics] Lyrics not found on lyrics.ovh');
      return null;
    }
    
    const data = await response.json();
    
    if (!data.lyrics) {
      return null;
    }
    
    console.log('[Lyrics] Successfully fetched from lyrics.ovh');
    
    return {
      plainLyrics: data.lyrics,
      source: 'Lyrics.ovh',
    };
  } catch (error) {
    console.error('[Lyrics] lyrics.ovh fetch error:', error);
    return null;
  }
}

// Clean title for better search results
function cleanTitle(title: string): string {
  return title
    .replace(/\s*[[(].*?[\])]\s*/g, '') // Remove [brackets] and (parentheses) content
    .replace(/\s*(official|video|audio|lyrics|hd|4k|visualizer|ft\.?|feat\.?|music\s*video).*/gi, '')
    .replace(/\s*-\s*$/, '')
    .replace(/\|.*$/, '')
    .trim();
}

// Clean artist name for better search results
function cleanArtist(artist: string): string {
  return artist
    .replace(/\s*(official|vevo|topic|music)$/gi, '')
    .replace(/\s*-\s*topic$/gi, '')
    .replace(/\s*VEVO$/i, '')
    .trim();
}

// Main lyrics fetch function with fallback chain
export async function fetchLyrics(videoId: string, title?: string, artist?: string): Promise<LyricsData | null> {
  try {
    // First try SimpMusic (best for YouTube videos, supports synced)
    const simpResult = await fetchFromSimpMusic(videoId);
    if (simpResult) return simpResult;
    
    // If we have title/artist, try other sources
    if (title && artist) {
      const cleanedTitle = cleanTitle(title);
      const cleanedArtist = cleanArtist(artist);
      
      // Try LrcLib (supports synced)
      const lrcLibResult = await fetchFromLrcLib(cleanedTitle, cleanedArtist);
      if (lrcLibResult) return lrcLibResult;
      
      // Try lyrics.ovh (plain only)
      const lyricsOvhResult = await fetchFromLyricsOvh(cleanedTitle, cleanedArtist);
      if (lyricsOvhResult) return lyricsOvhResult;
    }
    
    return null;
  } catch (error) {
    console.error('[Lyrics] Error in fetchLyrics:', error);
    return null;
  }
}

// Export individual fetchers for direct use
export { fetchFromSimpMusic, fetchFromLrcLib, fetchFromLyricsOvh, cleanTitle, cleanArtist };
