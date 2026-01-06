import { useState, useCallback } from 'react';
import { SearchResult, Video } from '@/types/music';

const API_BASE = 'https://yt.omada.cafe/api/v1';

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const getTrending = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/trending?type=music`);
      if (!response.ok) throw new Error('Failed to fetch trending');
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      // Fallback to a search if trending fails
      search('top hits 2024');
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Filter for music only - exclude long playlists/mixes (over 10 minutes)
  const videos = results
    .filter((r): r is Video => r.type === 'video')
    .filter(v => !v.lengthSeconds || v.lengthSeconds < 600); // Under 10 min = likely a song

  return {
    results,
    videos,
    loading,
    error,
    search,
    getTrending,
  };
}
