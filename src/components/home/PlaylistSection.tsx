import { useState, useEffect } from 'react';
import { Video } from '@/types/music';
import { PlayCircle, ChevronDown, Play, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerContext } from '@/context/PlayerContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const API_BASE = 'https://yt.omada.cafe/api/v1';

interface PlaylistData {
  title: string;
  artists: string[];
  query: string;
}

interface PlaylistSectionProps {
  title: string;
  playlists: PlaylistData[];
  onOpenChannel?: (artistName: string) => void;
}

export function PlaylistSection({ title, playlists, onOpenChannel }: PlaylistSectionProps) {
  const { playAll, playTrack, addToQueue } = usePlayerContext();
  const [playlistVideos, setPlaylistVideos] = useState<Map<string, Video[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);

  const visiblePlaylists = showAll ? playlists : playlists.slice(0, 5);

  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoading(true);
      const videoMap = new Map<string, Video[]>();

      await Promise.all(
        playlists.slice(0, 10).map(async (playlist) => {
          try {
            const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(playlist.query)}`);
            if (res.ok) {
              const data = await res.json();
              const videos = data
                .filter((r: any) => r.type === 'video' && r.lengthSeconds > 60 && r.lengthSeconds < 600)
                .slice(0, 8);
              videoMap.set(playlist.title, videos);
            }
          } catch (e) {
            console.error(`Failed to fetch ${playlist.title}:`, e);
          }
        })
      );

      setPlaylistVideos(videoMap);
      setLoading(false);
    };

    fetchPlaylists();
  }, [playlists]);

  const handlePlayPlaylist = (playlistTitle: string) => {
    const videos = playlistVideos.get(playlistTitle) || [];
    if (videos.length > 0) {
      playAll(videos);
      toast.success(`Playing ${playlistTitle}`);
    }
  };

  const handleToggleExpand = (playlistTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPlaylist(expandedPlaylist === playlistTitle ? null : playlistTitle);
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <div className={cn(
          showAll 
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" 
            : "flex gap-4 overflow-x-auto pb-2 scrollbar-thin"
        )}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={cn("w-40", !showAll && "flex-shrink-0")}>
              <div className="aspect-square rounded-xl bg-secondary/50 animate-pulse" />
              <div className="h-4 mt-2 bg-secondary/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {playlists.length > 5 && (
          <button 
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-primary/10 transition-all"
          >
            {showAll ? 'Show less' : 'More'} 
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", showAll && "rotate-180")} />
          </button>
        )}
      </div>

      <div className={cn(
        showAll 
          ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" 
          : "flex gap-4 overflow-x-auto pb-2 scrollbar-thin"
      )}>
        {visiblePlaylists.map((playlist, index) => {
          const videos = playlistVideos.get(playlist.title) || [];
          const thumbnail = videos[0]?.videoThumbnails?.[0]?.url || 
            `https://i.ytimg.com/vi/${videos[0]?.videoId}/mqdefault.jpg`;
          const isExpanded = expandedPlaylist === playlist.title;
          
          return (
            <div key={playlist.title} className={cn(!showAll && "flex-shrink-0 w-40")}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="group"
              >
                <button
                  onClick={() => handlePlayPlaylist(playlist.title)}
                  className="w-full text-left"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-secondary">
                    {videos.length > 0 ? (
                      <img
                        src={thumbnail}
                        alt={playlist.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PlayCircle className="w-10 h-10 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                    
                    {/* Play button overlay */}
                    <div className="absolute bottom-2 right-2 p-2.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg transform scale-90 group-hover:scale-100">
                      <Play className="w-4 h-4 text-primary-foreground fill-current" />
                    </div>

                    {/* Track count badge */}
                    {videos.length > 0 && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 rounded-md text-xs text-white/90 backdrop-blur-sm">
                        {videos.length} tracks
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-medium text-foreground text-sm mt-2 truncate">
                    {playlist.title}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {playlist.artists.slice(0, 2).join(', ')}
                  </p>
                </button>

                {/* Expand/collapse button for track list */}
                {videos.length > 0 && (
                  <button
                    onClick={(e) => handleToggleExpand(playlist.title, e)}
                    className="mt-1 text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                    {isExpanded ? 'Hide tracks' : 'Show tracks'}
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
