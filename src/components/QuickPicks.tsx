import { useEffect, useMemo, useState } from 'react';
import { Video } from '@/types/music';
import { MusicCard } from './MusicCard';
import { PlayCircle, Shuffle, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { usePlayerContext } from '@/context/PlayerContext';
import { getHistory, getPreferredArtists, getStats, getFavorites, getRecommendationWeights } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { getPlaylists } from '@/lib/playlists';
import { search as searchApi } from '@/lib/api';

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

// Diverse discovery queries for better recommendations
const DISCOVERY_QUERIES = [
  'top songs 2024',
  'best music hits',
  'popular songs playlist',
  'viral music 2024',
  'trending hits today',
  'new music weekly',
  'best of 2024 music',
  'chart topping songs',
  'most streamed songs',
  'hit songs today'
];

export function QuickPicks({ videos, onOpenChannel }: QuickPicksProps) {
  const { playAll, currentTrack } = usePlayerContext();
  const [mode, setMode] = useState<QuickPickMode>('mashup');
  const [seed, setSeed] = useState(() => Date.now());
  const [freshMusic, setFreshMusic] = useState<Video[]>([]);
  const [loadingFresh, setLoadingFresh] = useState(false);

  // Fetch fresh music for mashup based on user preferences
  useEffect(() => {
    const fetchFreshMusic = async () => {
      if (mode !== 'mashup') return;
      
      setLoadingFresh(true);
      try {
        const preferredArtists = getPreferredArtists();
        const history = getHistory();
        const stats = getStats();
        
        // Build diverse search queries from user data
        const queries: string[] = [];
        
        // Add preferred artists with variety
        if (preferredArtists.length > 0) {
          const shuffledArtists = [...preferredArtists].sort(() => Math.random() - 0.5);
          const topArtists = shuffledArtists.slice(0, 3);
          
          topArtists.forEach(artist => {
            const queryTypes = [
              `${artist.name} top songs`,
              `${artist.name} best hits`,
              `${artist.name} music`,
            ];
            queries.push(queryTypes[Math.floor(Math.random() * queryTypes.length)]);
          });
        }
        
        // Add based on top artists from stats
        if (stats.topArtists && stats.topArtists.length > 0) {
          const topArtist = stats.topArtists[0];
          queries.push(`similar to ${topArtist.name} music`);
        }
        
        // Add based on recent history genres/artists
        if (history.length > 0) {
          const recentAuthors = [...new Set(history.slice(0, 10).map(v => v.author))];
          const shuffledAuthors = recentAuthors.sort(() => Math.random() - 0.5);
          queries.push(...shuffledAuthors.slice(0, 2).map(a => `${a} songs`));
        }
        
        // Add discovery queries for variety
        const shuffledDiscovery = [...DISCOVERY_QUERIES].sort(() => Math.random() - 0.5);
        queries.push(...shuffledDiscovery.slice(0, 2));
        
        // Fetch from multiple queries (max 4 for performance)
        const queriesToFetch = queries.slice(0, 4);
        const allResults: Video[] = [];
        
        for (const query of queriesToFetch) {
          try {
            const results = await searchApi(query);
            const musicVideos = results
              .filter((r): r is Video => r.type === 'video')
              .filter(v => v.lengthSeconds > 60 && v.lengthSeconds < 600); // Music only
            allResults.push(...musicVideos);
          } catch (e) {
            console.error(`Failed to fetch ${query}:`, e);
          }
        }
        
        // Deduplicate
        const unique = new Map<string, Video>();
        allResults.forEach(v => {
          if (!unique.has(v.videoId)) {
            unique.set(v.videoId, v);
          }
        });
        
        setFreshMusic(Array.from(unique.values()));
      } catch (error) {
        console.error('Failed to fetch fresh music:', error);
      } finally {
        setLoadingFresh(false);
      }
    };
    
    fetchFreshMusic();
  }, [mode, seed]);

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
  }, [currentTrack?.videoId, seed]);

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
        // Smart Mashup Algorithm - mix fresh music with user data
        const scored = new Map<string, { video: Video; score: number }>();
        
        // Collect all candidate videos - prioritize fresh music
        const allCandidates: Video[] = [
          ...freshMusic,  // Fresh fetched music
          ...videos,
          ...history.slice(0, 20),
          ...favorites.slice(0, 15),
          ...playlists.flatMap(p => p.tracks.slice(0, 5))
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

          // Fresh music gets a significant boost
          if (freshMusic.some(f => f.videoId === videoId)) {
            score += 50;
          }

          // Artist preference score (strongest signal)
          const artistData = preferredArtists.find(a => {
            const artistLower = a.name.toLowerCase();
            const authorLower = video.author.toLowerCase();
            return authorLower.includes(artistLower) || artistLower.includes(authorLower);
          });
          if (artistData) {
            score += weights.artistWeight * 100;
            score += Math.min((artistData.playCount || 0) * 3, 30);
          }

          // History recency score (lower weight to mix in new stuff)
          const historyIndex = history.findIndex(h => h.videoId === videoId);
          if (historyIndex >= 0) {
            score += weights.historyWeight * Math.max(0, 40 - historyIndex * 2);
          }

          // Stats score from top tracks
          const trackStat = stats.topTracks.find(t => t.videoId === videoId);
          if (trackStat) {
            score += weights.statsWeight * Math.min(trackStat.plays * 5, 40);
          }

          // Favorite bonus
          if (favorites.some(f => f.videoId === videoId)) {
            score += 35;
          }

          // Playlist bonus
          const inPlaylist = playlists.some(p => p.tracks.some(v => v.videoId === videoId));
          if (inPlaylist) {
            score += 20;
          }

          // Random exploration factor for variety
          score += weights.explorationWeight * (stableHash(videoId, seed) % 50);

          scored.set(videoId, { video, score });
        });

        // Sort by score with slight randomization
        const sortedVideos = Array.from(scored.values())
          .sort((a, b) => {
            const randomA = stableHash(a.video.videoId, seed) % 20;
            const randomB = stableHash(b.video.videoId, seed) % 20;
            return (b.score + randomB) - (a.score + randomA);
          })
          .slice(0, 8)
          .map(x => x.video);

        return sortedVideos;
      }
    }
  }, [userData, mode, videos, seed, freshMusic]);

  const handlePlayAll = () => {
    if (displayVideos.length > 0) {
      playAll(displayVideos);
    }
  };

  const handleRefresh = () => {
    setSeed(Date.now());
  };

  const modes = [
    { id: 'mashup' as const, label: 'For You', icon: Shuffle },
    { id: 'lastPlayed' as const, label: 'Recent', icon: Clock },
    { id: 'mostPlayed' as const, label: 'Top', icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
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

          {mode === 'mashup' && (
            <button
              onClick={handleRefresh}
              disabled={loadingFresh}
              className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", loadingFresh && "animate-spin")} />
            </button>
          )}

          <button 
            onClick={handlePlayAll}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-sm font-medium transition-colors"
          >
            <PlayCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Play all</span>
          </button>
        </div>
      </div>

      {displayVideos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            {mode === 'lastPlayed' || mode === 'mostPlayed' 
              ? 'Start listening to see your picks here'
              : loadingFresh ? 'Loading fresh picks...' : 'No tracks available'
            }
          </p>
        </div>
      ) : (
        <motion.div 
          key={`${mode}-${seed}`}
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
