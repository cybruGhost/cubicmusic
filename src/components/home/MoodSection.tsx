import { useState, useEffect } from 'react';
import { Video } from '@/types/music';
import { MusicCard } from '@/components/MusicCard';
import { PlayCircle, ChevronRight } from 'lucide-react';
import { usePlayerContext } from '@/context/PlayerContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const API_BASE = 'https://yt.omada.cafe/api/v1';

interface MixData {
  title: string;
  artists: string[];
  query: string;
}

interface MoodSectionProps {
  mood: string;
  mixes: MixData[];
  onOpenChannel?: (artistName: string) => void;
}

export function MoodSection({ mood, mixes, onOpenChannel }: MoodSectionProps) {
  const { playAll } = usePlayerContext();
  const [mixVideos, setMixVideos] = useState<Map<string, Video[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedMix, setExpandedMix] = useState<string | null>(null);

  useEffect(() => {
    const fetchMixes = async () => {
      setLoading(true);
      const videoMap = new Map<string, Video[]>();

      await Promise.all(
        mixes.map(async (mix) => {
          try {
            const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(mix.query)}`);
            if (res.ok) {
              const data = await res.json();
              const videos = data
                .filter((r: any) => r.type === 'video' && r.lengthSeconds > 60 && r.lengthSeconds < 600)
                .slice(0, 8);
              videoMap.set(mix.title, videos);
            }
          } catch (e) {
            console.error(`Failed to fetch ${mix.title}:`, e);
          }
        })
      );

      setMixVideos(videoMap);
      setLoading(false);
    };

    fetchMixes();
  }, [mixes]);

  const handlePlayMix = (mixTitle: string) => {
    const videos = mixVideos.get(mixTitle) || [];
    if (videos.length > 0) {
      playAll(videos);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">{mood}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-2xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{mood}</h2>
        <span className="text-sm text-muted-foreground">Mixed for you</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {mixes.map((mix, index) => {
          const videos = mixVideos.get(mix.title) || [];
          const thumbnail = videos[0]?.videoThumbnails?.[0]?.url || 
            `https://i.ytimg.com/vi/${videos[0]?.videoId}/mqdefault.jpg`;
          
          return (
            <motion.div
              key={mix.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              <button
                onClick={() => setExpandedMix(expandedMix === mix.title ? null : mix.title)}
                className="w-full text-left"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-secondary">
                  {videos.length > 0 && (
                    <img
                      src={thumbnail}
                      alt={mix.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayMix(mix.title);
                    }}
                    className="absolute bottom-3 right-3 p-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                  >
                    <PlayCircle className="w-5 h-5 text-primary-foreground" />
                  </button>
                  
                  <div className="absolute bottom-3 left-3 right-12">
                    <h3 className="font-semibold text-white text-sm truncate">{mix.title}</h3>
                    <p className="text-xs text-white/70 truncate mt-0.5">
                      {mix.artists.slice(0, 2).join(', ')}
                    </p>
                  </div>
                </div>
              </button>

              {/* Expanded view */}
              {expandedMix === mix.title && videos.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-2"
                >
                  {videos.slice(0, 4).map((video) => (
                    <MusicCard
                      key={video.videoId}
                      video={video}
                      variant="compact"
                      onOpenChannel={onOpenChannel}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
