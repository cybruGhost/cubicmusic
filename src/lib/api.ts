import type { SearchResult, Video } from '@/types/music';

const API_BASE = 'https://yt.omada.cafe/api/v1';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function search(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  return fetchJson<SearchResult[]>(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
}

export async function searchVideos(query: string): Promise<Video[]> {
  const results = await search(query);
  return results.filter((r): r is Video => r.type === 'video');
}

export async function getRelatedVideos(videoId: string): Promise<Video[]> {
  // The backend returns video info plus recommended videos for many endpoints.
  const data: any = await fetchJson<any>(`${API_BASE}/videos/${encodeURIComponent(videoId)}?local=true`);
  const candidates: any[] =
    data?.recommendedVideos || data?.recommended || data?.relatedVideos || data?.related || [];

  return (Array.isArray(candidates) ? candidates : [])
    .filter((v) => v && v.type === 'video' && typeof v.videoId === 'string')
    .map((v) => v as Video);
}
