import { LyricsData } from '@/types/music';

const LYRICS_API = 'https://api-lyrics.simpmusic.org/v1';

export async function fetchLyrics(videoId: string): Promise<LyricsData | null> {
  try {
    const response = await fetch(`${LYRICS_API}/${videoId}?limit=10`);
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
      return {
        syncedLyrics: best.syncedLyrics || undefined,
        plainLyrics: best.plainLyrics || undefined,
        source: 'SimpMusic',
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return null;
  }
}
