import { useState, useEffect } from 'react';
import { Video } from '@/types/music';
import { PlayCircle, Clock } from 'lucide-react';
import { usePlayerContext } from '@/context/PlayerContext';
import { motion } from 'framer-motion';

const API_BASE = 'https://yt.omada.cafe/api/v1';

// Queries for long-form content
const LONG_LISTEN_QUERIES = [
  'indie folk compilation playlist',
  'lo-fi study music 2 hours',
  'acoustic covers playlist long',
  'chill music mix 1 hour',
  'relaxing piano music compilation',
  'jazz coffee shop 2 hours',
  'ambient music for studying',
  'worship music 1 hour',
  'soft rock compilation',
  'acoustic guitar playlist',
];

interface LongListensSectionProps {
  onOpenChannel?: (artistName: string) => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function LongListensSection({ onOpenChannel }: LongListensSectionProps) {
  const { playTrack } = usePlayerContext();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLongListens = async () => {
      setLoading(true);
      
      try {
        const shuffledQueries = [...LONG_LISTEN_QUERIES].sort(() => Math.random() - 0.5);
        const allVideos: Video[] = [];
        
        await Promise.all(
          shuffledQueries.slice(0, 4).map(async (query) => {
            try {
              const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
              if (res.ok) {
                const data = await res.json();
                // Filter for long videos (>15 minutes)
                const longVideos = data
                  .filter((r: any) => r.type === 'video' && r.lengthSeconds > 900)
                  .slice(0, 5);
                allVideos.push(...longVideos);
              }
            } catch (e) {
              console.error(`Failed to fetch ${query}:`, e);
            }
          })
        );
        
        // Deduplicate
        const unique = new Map<string, Video>();
        allVideos.forEach(v => {
          if (!unique.has(v.videoId)) {
            unique.set(v.videoId, v);
          }
        });
        
        setVideos(Array.from(unique.values()).slice(0, 12));
      } catch (error) {
        console.error('Failed to fetch long listens:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLongListens();
  }, []);

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Long listens</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-video rounded-xl bg-secondary/50 animate-pulse" />
              <div className="h-4 bg-secondary/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Long listens</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {videos.map((video, index) => {
          const thumbnail = video.videoThumbnails?.[0]?.url || 
            `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`;
          
          return (
            <motion.button
              key={video.videoId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => playTrack(video)}
              className="group text-left"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary">
                <img
                  src={thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                
                {/* Duration badge */}
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs text-white flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(video.lengthSeconds)}
                </div>
                
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-3 bg-primary rounded-full shadow-lg">
                    <PlayCircle className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
              </div>
              
              <h3 className="font-medium text-foreground text-sm mt-2 line-clamp-2">
                {video.title}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {video.author}
              </p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
