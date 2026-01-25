import { useState, useEffect } from 'react';
import { Video } from '@/types/music';
import { PlayCircle, Sparkles } from 'lucide-react';
import { usePlayerContext } from '@/context/PlayerContext';
import { getPreferredArtists, getHistory } from '@/lib/storage';
import { motion } from 'framer-motion';

const API_BASE = 'https://yt.omada.cafe/api/v1';

// Default mix suggestions
const DEFAULT_MIXES = [
  { name: 'Electronic mix', query: 'electronic music upbeat', style: 'Upbeat • Popular' },
  { name: 'Pop mix', query: 'pop music hits 2024', style: 'Upbeat • Deep cuts' },
  { name: 'Hip Hop mix', query: 'hip hop rap music', style: 'Upbeat • 2020s' },
  { name: 'Rock mix', query: 'rock music hits', style: 'Upbeat • Classic' },
  { name: 'R&B mix', query: 'r&b soul music', style: 'Chill • Popular' },
  { name: 'Indie mix', query: 'indie alternative music', style: 'Upbeat • 2010s' },
];

interface MixItem {
  name: string;
  query: string;
  style: string;
  artists: string[];
  videos: Video[];
  thumbnail?: string;
}

interface CreateMixSectionProps {
  onOpenChannel?: (artistName: string) => void;
}

export function CreateMixSection({ onOpenChannel }: CreateMixSectionProps) {
  const { playAll } = usePlayerContext();
  const [mixes, setMixes] = useState<MixItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMixes = async () => {
      setLoading(true);
      
      try {
        // Get user data for personalized mixes
        const preferredArtists = getPreferredArtists();
        const history = getHistory();
        
        // Build mix list
        const mixList: { name: string; query: string; style: string }[] = [];
        
        // Add artist-based mixes from user preferences
        if (preferredArtists.length > 0) {
          const shuffled = [...preferredArtists].sort(() => Math.random() - 0.5);
          shuffled.slice(0, 3).forEach(artist => {
            mixList.push({
              name: `${artist.name} mix`,
              query: `${artist.name} songs playlist`,
              style: 'Upbeat • For you',
            });
          });
        }
        
        // Add history-based mixes
        if (history.length > 0) {
          const recentArtists = [...new Set(history.slice(0, 10).map(v => v.author))];
          recentArtists.slice(0, 2).forEach(artist => {
            if (!mixList.some(m => m.name.toLowerCase().includes(artist.toLowerCase()))) {
              mixList.push({
                name: `${artist} mix`,
                query: `${artist} music playlist`,
                style: 'Recent • Popular',
              });
            }
          });
        }
        
        // Add default mixes
        const shuffledDefaults = [...DEFAULT_MIXES].sort(() => Math.random() - 0.5);
        mixList.push(...shuffledDefaults.slice(0, 6 - mixList.length));
        
        // Fetch videos for each mix
        const fetchedMixes: MixItem[] = await Promise.all(
          mixList.slice(0, 6).map(async (mix) => {
            try {
              const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(mix.query)}`);
              if (res.ok) {
                const data = await res.json();
                const videos = data
                  .filter((r: any) => r.type === 'video' && r.lengthSeconds > 60 && r.lengthSeconds < 600)
                  .slice(0, 10);
                
                const artists = [...new Set(videos.map((v: Video) => v.author))].slice(0, 4);
                const thumbnail = videos[0]?.videoThumbnails?.[0]?.url;
                
                return {
                  ...mix,
                  artists: artists as string[],
                  videos,
                  thumbnail,
                };
              }
            } catch (e) {
              console.error(`Failed to fetch ${mix.name}:`, e);
            }
            return { ...mix, artists: [], videos: [] };
          })
        );
        
        setMixes(fetchedMixes.filter(m => m.videos.length > 0));
      } catch (error) {
        console.error('Failed to fetch mixes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMixes();
  }, []);

  const handlePlayMix = (mix: MixItem) => {
    if (mix.videos.length > 0) {
      playAll(mix.videos);
    }
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Create a mix
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-shrink-0 w-48">
              <div className="aspect-square rounded-xl bg-secondary/50 animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        Create a mix
      </h2>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
        {mixes.map((mix, index) => (
          <motion.button
            key={mix.name}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handlePlayMix(mix)}
            className="flex-shrink-0 w-48 group text-left"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-primary/30 to-secondary">
              {mix.thumbnail && (
                <img
                  src={mix.thumbnail}
                  alt={mix.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              <div className="absolute bottom-2 right-2 p-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                <PlayCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              
              <div className="absolute bottom-3 left-3 right-10">
                <h3 className="font-semibold text-white text-sm">{mix.name}</h3>
                <p className="text-xs text-white/70">{mix.style}</p>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2 truncate">
              {mix.artists.join(', ')}
            </p>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
