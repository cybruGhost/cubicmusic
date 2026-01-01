import { useEffect, useMemo, useState } from 'react';
import { Video } from '@/types/music';
import { MusicCard } from './MusicCard';
import { PlayCircle, Shuffle, Clock, TrendingUp } from 'lucide-react';
import { usePlayerContext } from '@/context/PlayerContext';
import { getHistory, getPreferredArtists, getStats, getFavorites, getRecommendationWeights } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { getPlaylists } from '@/lib/playlists';

interface QuickPicksProps {
  videos: Video[];
  onOpenChannel?: (artistName: string) => void;
}

type QuickPickMode = 'mashup' | 'lastPlayed' | 'mostPlayed';

function stableHash(input: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function QuickPicks({ videos, onOpenChannel }: QuickPicksProps) {
  const { playAll, currentTrack } = usePlayerContext();
  const [mode, setMode] = useState<QuickPickMode>('mashup');
  const [seed] = useState(() => Date.now());

  // Gather all user data sources
  const userData = useMemo(() => {
    return {
      history: getHistory(),
      preferredArtists: getPreferredArtists(),
      stats: getStats(),
      favorites: getFavorites(),
      playlists: getPlaylists(),
      weights: getRecommendationWeights()
    };
  }, [currentTrack?.videoId]);

  const displayVideos = useMemo((): Video[] => {
    const { history, preferredArtists, stats, favorites, playlists, weights } = userData;

    switch (mode) {
      case 'lastPlayed':
        return history.slice(0, 8);

      case 'mostPlayed': {
        const playCount = new Map<string, { video: Video; count: number }>();
        history.forEach(v => {
          const existing = playCount.get(v.videoId);
          if (existing) existing.count++;
          else playCount.set(v.videoId, { video: v, count: 1 });
        });
        return Array.from(playCount.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
          .map(x => x.video);
      }

      default: {
        // Smart Mashup Algorithm
        const scored = new Map<string, { video: Video; score: number }>();
        
        // Collect all candidate videos
        const allCandidates: Video[] = [
          ...videos,
          ...history.slice(0, 20),
          ...favorites.slice(0, 20),
          ...playlists.flatMap(p => p.tracks.slice(0, 10))
        ];

        // Deduplicate
        const uniqueVideos = new Map<string, Video>();
        allCandidates.forEach(v => {
          if (!uniqueVideos.has(v.videoId)) {
            uniqueVideos.set(v.videoId, v);
          }
        });

        // Score each video
        uniqueVideos.forEach((video, videoId) => {
          let score = 0;

          // Artist preference score
          const artistData = preferredArtists.find(a => 
            video.author.toLowerCase().includes(a.name.toLowerCase()) ||
            a.name.toLowerCase().includes(video.author.toLowerCase())
          );
          if (artistData) {
            score += weights.artistWeight * 100;
            score += (artistData.playCount || 0) * 2;
          }

          // History recency score
          const historyIndex = history.findIndex(h => h.videoId === videoId);
          if (historyIndex >= 0) {
            score += weights.historyWeight * (50 - historyIndex);
          }

          // Stats score (top tracks bonus)
          const trackStat = stats.topTracks.find(t => t.videoId === videoId);
          if (trackStat) {
            score += weights.statsWeight * trackStat.plays * 5;
          }

          // Favorite bonus
          if (favorites.some(f => f.videoId === videoId)) {
            score += 30;
          }

          // Playlist bonus
          const inPlaylist = playlists.some(p => p.tracks.some(v => v.videoId === videoId));
          if (inPlaylist) {
            score += 20;
          }

          // Exploration randomness
          score += weights.explorationWeight * (stableHash(videoId, seed) % 50);

          scored.set(videoId, { video, score });
        });

        // Sort by score and add some randomization
        const sortedVideos = Array.from(scored.values())
          .sort((a, b) => {
            // Add randomness factor to avoid always same order
            const randomA = stableHash(a.video.videoId, seed) % 20;
            const randomB = stableHash(b.video.videoId, seed) % 20;
            return (b.score + randomB) - (a.score + randomA);
          })
          .slice(0, 8)
          .map(x => x.video);

        return sortedVideos;
      }
    }
  }, [userData, mode, videos, seed]);

  const handlePlayAll = () => {
    if (displayVideos.length > 0) {
      playAll(displayVideos);
    }
  };

  const modes = [
    { id: 'mashup' as const, label: 'For You', icon: Shuffle },
    { id: 'lastPlayed' as const, label: 'Recent', icon: Clock },
    { id: 'mostPlayed' as const, label: 'Top', icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Quick Picks</h2>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-secondary/50 rounded-lg p-1">
            {modes.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  mode === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <button 
            onClick={handlePlayAll}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-sm font-medium transition-colors"
          >
            <PlayCircle className="w-4 h-4" />
            Play all
          </button>
        </div>
      </div>

      {displayVideos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            {mode === 'lastPlayed' || mode === 'mostPlayed' 
              ? 'Start listening to see your picks here'
              : 'No tracks available'
            }
          </p>
        </div>
      ) : (
        <motion.div 
          key={mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-2"
        >
          {displayVideos.map((video, i) => (
            <motion.div
              key={video.videoId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <MusicCard video={video} variant="compact" onOpenChannel={onOpenChannel} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}