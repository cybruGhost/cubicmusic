import { useState, useEffect } from 'react';
import { Video } from '@/types/music';
import { Play, Plus, ChevronDown, Shuffle } from 'lucide-react';
import { usePlayerContext } from '@/context/PlayerContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  const { playAll, playTrack, addToQueue } = usePlayerContext();
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
      toast.success(`Playing ${mixTitle}`);
    }
  };

  const handleShuffleMix = (mixTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const videos = mixVideos.get(mixTitle) || [];
    if (videos.length > 0) {
      const shuffled = [...videos].sort(() => Math.random() - 0.5);
      playAll(shuffled);
      toast.success(`Shuffling ${mixTitle}`);
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
          const isExpanded = expandedMix === mix.title;
          
          return (
            <div key={mix.title}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-secondary cursor-pointer"
                  onClick={() => handlePlayMix(mix.title)}
                >
                  {videos.length > 0 && (
                    <img
                      src={thumbnail}
                      alt={mix.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Play & Shuffle buttons */}
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <button
                      onClick={(e) => handleShuffleMix(mix.title, e)}
                      className="p-2.5 bg-secondary/80 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-secondary shadow-lg backdrop-blur-sm"
                      title="Shuffle"
                    >
                      <Shuffle className="w-4 h-4 text-foreground" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayMix(mix.title);
                      }}
                      className="p-2.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                      title="Play"
                    >
                      <Play className="w-4 h-4 text-primary-foreground fill-current" />
                    </button>
                  </div>
                  
                  <div className="absolute bottom-3 left-3 right-20">
                    <h3 className="font-semibold text-white text-sm truncate">{mix.title}</h3>
                    <p className="text-xs text-white/70 truncate mt-0.5">
                      {mix.artists.slice(0, 2).join(', ')}
                    </p>
                  </div>

                  {/* Track count */}
                  {videos.length > 0 && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 rounded-md text-xs text-white/90 backdrop-blur-sm">
                      {videos.length} songs
                    </div>
                  )}
                </div>

                {/* Show tracks toggle */}
                {videos.length > 0 && (
                  <button
                    onClick={() => setExpandedMix(isExpanded ? null : mix.title)}
                    className="mt-1.5 text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                    {isExpanded ? 'Hide tracks' : `${videos.length} tracks`}
                  </button>
                )}
              </motion.div>

              {/* Expanded track list */}
              <AnimatePresence>
                {isExpanded && videos.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-1 bg-secondary/30 rounded-lg p-2">
                      {videos.map((video, vi) => (
                        <button
                          key={video.videoId}
                          onClick={() => playTrack(video)}
                          className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary/80 transition-colors group/track text-left"
                        >
                          <span className="text-xs text-muted-foreground w-4 text-right">{vi + 1}</span>
                          <img 
                            src={`https://i.ytimg.com/vi/${video.videoId}/default.jpg`}
                            alt=""
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{video.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{video.author}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToQueue(video);
                              toast.success('Added to queue');
                            }}
                            className="p-1 opacity-0 group-hover/track:opacity-100 hover:bg-secondary rounded transition-all"
                          >
                            <Plus className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
