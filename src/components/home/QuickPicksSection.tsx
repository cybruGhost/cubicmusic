import { useState, useEffect, useMemo } from 'react';
import { Video } from '@/types/music';
import { MusicCard } from '@/components/MusicCard';
import { PlayCircle, Shuffle, RefreshCw } from 'lucide-react';
import { usePlayerContext } from '@/context/PlayerContext';
import { getHistory, getPreferredArtists, getFavorites } from '@/lib/storage';
import { motion } from 'framer-motion';

const API_BASE = 'https://yt.omada.cafe/api/v1';

// Diverse queries for quick picks
const QUICK_PICK_QUERIES = [
  'Coldplay top hits',
  'Shakira best songs',
  'Ed Sheeran popular',
  'Noah Kahan hits',
  'AJR best songs',
  'JVKE songs',
  'BoyWithUke music',
  'trending music 2024',
  'viral songs 2024',
  'top hits today',
];

interface QuickPicksSectionProps {
  onOpenChannel?: (artistName: string) => void;
}

export function QuickPicksSection({ onOpenChannel }: QuickPicksSectionProps) {
  const { playAll } = usePlayerContext();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [seed, setSeed] = useState(Date.now());

  useEffect(() => {
    const fetchQuickPicks = async () => {
      setLoading(true);
      
      try {
        // Get user data for personalization
        const preferredArtists = getPreferredArtists();
        const history = getHistory();
        const favorites = getFavorites();
        
        // Build diverse queries
        const queries: string[] = [];
        
        // Add preferred artists
        if (preferredArtists.length > 0) {
          const shuffled = [...preferredArtists].sort(() => Math.random() - 0.5);
          queries.push(...shuffled.slice(0, 3).map(a => `${a.name} songs`));
        }
        
        // Add recent history artists
        if (history.length > 0) {
          const recentArtists = [...new Set(history.slice(0, 10).map(v => v.author))];
          queries.push(...recentArtists.slice(0, 2).map(a => `${a} music`));
        }
        
        // Add diverse default queries
        const shuffledDefaults = [...QUICK_PICK_QUERIES].sort(() => Math.random() - 0.5);
        queries.push(...shuffledDefaults.slice(0, 4));
        
        // Fetch from multiple queries
        const allVideos: Video[] = [];
        const queryPromises = queries.slice(0, 5).map(async (query) => {
          try {
            const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
            if (res.ok) {
              const data = await res.json();
              return data
                .filter((r: any) => r.type === 'video' && r.lengthSeconds > 60 && r.lengthSeconds < 600)
                .slice(0, 4);
            }
          } catch (e) {
            console.error(`Failed to fetch ${query}:`, e);
          }
          return [];
        });
        
        const results = await Promise.all(queryPromises);
        results.forEach(vids => allVideos.push(...vids));
        
        // Deduplicate and score
        const unique = new Map<string, Video>();
        allVideos.forEach(v => {
          if (!unique.has(v.videoId)) {
            unique.set(v.videoId, v);
          }
        });
        
        // Shuffle and take top 9
        const shuffled = Array.from(unique.values())
          .sort(() => Math.random() - 0.5)
          .slice(0, 9);
        
        setVideos(shuffled);
      } catch (error) {
        console.error('Failed to fetch quick picks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuickPicks();
  }, [seed]);

  const handlePlayAll = () => {
    if (videos.length > 0) {
      playAll(videos);
    }
  };

  const handleRefresh = () => {
    setSeed(Date.now());
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Quick picks</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Quick picks</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-full hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={handlePlayAll}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-sm font-medium transition-colors"
          >
            <PlayCircle className="w-4 h-4" />
            Play all
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {videos.map((video, index) => (
          <motion.div
            key={video.videoId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <MusicCard
              video={video}
              variant="compact"
              onOpenChannel={onOpenChannel}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
