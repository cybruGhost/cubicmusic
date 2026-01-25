import { useState, useEffect } from 'react';
import { Video } from '@/types/music';
import { PlayCircle, ChevronRight } from 'lucide-react';
import { usePlayerContext } from '@/context/PlayerContext';
import { motion } from 'framer-motion';

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
  const { playAll } = usePlayerContext();
  const [playlistVideos, setPlaylistVideos] = useState<Map<string, Video[]>>(new Map());
  const [loading, setLoading] = useState(true);

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
                .slice(0, 6);
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
    }
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-shrink-0 w-40">
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
        <button className="text-sm text-primary hover:underline flex items-center gap-1">
          More <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
        {playlists.map((playlist, index) => {
          const videos = playlistVideos.get(playlist.title) || [];
          const thumbnail = videos[0]?.videoThumbnails?.[0]?.url || 
            `https://i.ytimg.com/vi/${videos[0]?.videoId}/mqdefault.jpg`;
          
          return (
            <motion.div
              key={playlist.title}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex-shrink-0 w-40 group"
            >
              <button
                onClick={() => handlePlayPlaylist(playlist.title)}
                className="w-full text-left"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-secondary">
                  {videos.length > 0 && (
                    <img
                      src={thumbnail}
                      alt={playlist.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                  
                  <div className="absolute bottom-2 right-2 p-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                    <PlayCircle className="w-5 h-5 text-primary-foreground" />
                  </div>
                </div>
                
                <h3 className="font-medium text-foreground text-sm mt-2 truncate">
                  {playlist.title}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {playlist.artists.slice(0, 2).join(', ')}
                </p>
              </button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
