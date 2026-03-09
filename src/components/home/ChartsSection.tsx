import { useState, useEffect } from 'react';
import { Video } from '@/types/music';
import { TrendingUp, Play, Plus, ChevronRight, BarChart3, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerContext } from '@/context/PlayerContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const API_BASE = 'https://yt.omada.cafe/api/v1';

const CHART_CATEGORIES = [
  { id: 'top', label: 'Top songs', query: 'billboard hot 100 songs 2025', icon: TrendingUp },
  { id: 'trending', label: 'Trending', query: 'trending songs today viral hits 2025', icon: BarChart3 },
  { id: 'global', label: 'Global Top 50', query: 'spotify top 50 global songs', icon: Globe },
];

interface ChartsSectionProps {
  onOpenChannel?: (artistName: string) => void;
}

export function ChartsSection({ onOpenChannel }: ChartsSectionProps) {
  const { playTrack, addToQueue, playAll } = usePlayerContext();
  const [activeChart, setActiveChart] = useState('top');
  const [chartVideos, setChartVideos] = useState<Map<string, Video[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchCharts = async () => {
      setLoading(true);
      const videoMap = new Map<string, Video[]>();

      await Promise.all(
        CHART_CATEGORIES.map(async (cat) => {
          try {
            const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(cat.query)}`);
            if (res.ok) {
              const data = await res.json();
              const videos = data
                .filter((r: any) => r.type === 'video' && r.lengthSeconds > 60 && r.lengthSeconds < 600)
                .slice(0, 20);
              videoMap.set(cat.id, videos);
            }
          } catch (e) {
            console.error(`Failed to fetch chart ${cat.label}:`, e);
          }
        })
      );

      setChartVideos(videoMap);
      setLoading(false);
    };

    fetchCharts();
  }, []);

  const currentVideos = chartVideos.get(activeChart) || [];
  const visibleVideos = showAll ? currentVideos : currentVideos.slice(0, 10);

  const handlePlayAll = () => {
    if (currentVideos.length > 0) {
      playAll(currentVideos);
      toast.success('Playing chart');
    }
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Charts
        </h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="w-6 h-4 bg-secondary/50 rounded animate-pulse" />
              <div className="w-12 h-12 bg-secondary/50 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-3/4 bg-secondary/50 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-secondary/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Charts
        </h2>
        <button
          onClick={handlePlayAll}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-sm font-medium transition-colors"
        >
          <Play className="w-4 h-4 fill-current" />
          Play all
        </button>
      </div>

      {/* Chart category tabs */}
      <div className="flex gap-2">
        {CHART_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => { setActiveChart(cat.id); setShowAll(false); }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all border",
                activeChart === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/60 text-foreground hover:bg-secondary border-border/50"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Chart list */}
      <div className="space-y-1">
        {visibleVideos.map((video, index) => (
          <motion.div
            key={video.videoId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => playTrack(video)}
            className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-accent/80 group transition-all border border-transparent hover:border-border/50"
          >
            {/* Rank */}
            <span className={cn(
              "w-7 text-center text-sm font-bold tabular-nums",
              index < 3 ? "text-primary" : "text-muted-foreground"
            )}>
              {index + 1}
            </span>

            {/* Thumbnail */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
              <img
                src={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
                alt={video.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-5 h-5 text-white fill-current" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{video.title}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenChannel?.(video.author);
                }}
                className="text-xs text-muted-foreground hover:text-primary truncate transition-colors block"
              >
                {video.author}
              </button>
            </div>

            {/* Duration */}
            <span className="text-xs text-muted-foreground tabular-nums hidden sm:block">
              {Math.floor(video.lengthSeconds / 60)}:{(video.lengthSeconds % 60).toString().padStart(2, '0')}
            </span>

            {/* Views */}
            {video.viewCount > 0 && (
              <span className="text-xs text-muted-foreground hidden md:block">
                {video.viewCount >= 1_000_000 
                  ? `${(video.viewCount / 1_000_000).toFixed(1)}M` 
                  : video.viewCount >= 1_000 
                    ? `${(video.viewCount / 1_000).toFixed(0)}K`
                    : video.viewCount}
              </span>
            )}

            {/* Add to queue */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                addToQueue(video);
                toast.success('Added to queue');
              }}
              className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary rounded-full"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Show more/less */}
      {currentVideos.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center py-2 text-sm text-primary hover:text-primary/80 flex items-center justify-center gap-1 transition-colors"
        >
          {showAll ? 'Show less' : `Show all ${currentVideos.length}`}
          <ChevronRight className={cn("w-4 h-4 transition-transform", showAll && "rotate-90")} />
        </button>
      )}
    </section>
  );
}
