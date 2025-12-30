import { useEffect, useMemo, useState } from 'react';
import { Video } from '@/types/music';
import { MusicCard } from './MusicCard';
import { PlayCircle, Shuffle, Clock, TrendingUp } from 'lucide-react';
import { usePlayerContext } from '@/context/PlayerContext';
import { getHistory } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface QuickPicksProps {
  videos: Video[];
}

type QuickPickMode = 'mashup' | 'lastPlayed' | 'mostPlayed';

function stableHash(input: string): number {
  // Simple deterministic hash (fast + good enough for ordering)
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function QuickPicks({ videos }: QuickPicksProps) {
  const { playAll, currentTrack } = usePlayerContext();
  const [mode, setMode] = useState<QuickPickMode>('mashup');
  const [history, setHistory] = useState<Video[]>(() => getHistory());
  const [mashupSeed, setMashupSeed] = useState(() => String(Date.now()));

  useEffect(() => {
    // Refresh when playback changes or user switches modes
    setHistory(getHistory());
    if (mode === 'mashup') setMashupSeed(String(Date.now()));
  }, [currentTrack?.videoId, mode]);

  const displayVideos = useMemo((): Video[] => {
    switch (mode) {
      case 'lastPlayed':
        return history.slice(0, 8);
      case 'mostPlayed': {
        // Use history as a proxy for most played
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
        // Mashup — stable per seed (no flicker on re-renders)
        return [...videos]
          .sort((a, b) => stableHash(a.videoId + mashupSeed) - stableHash(b.videoId + mashupSeed))
          .slice(0, 8);
      }
    }
  }, [history, mashupSeed, mode, videos]);

  const handlePlayAll = () => {
    if (displayVideos.length > 0) {
      playAll(displayVideos);
    }
  };

  const modes = [
    { id: 'mashup' as const, label: 'Mashup', icon: Shuffle },
    { id: 'lastPlayed' as const, label: 'Last Played', icon: Clock },
    { id: 'mostPlayed' as const, label: 'Most Played', icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Quick Picks</h2>
        
        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
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
              <MusicCard video={video} variant="compact" />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
