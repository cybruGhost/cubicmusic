import { useState, useEffect } from 'react';
import { Play, Plus, Disc3, Music2, Video, Sparkles, TrendingUp, Globe } from 'lucide-react';
import { Video as VideoType } from '@/types/music';
import { searchVideos } from '@/lib/api';
import { usePlayerContext } from '@/context/PlayerContext';
import { toast } from 'sonner';
import { getPreferredArtists, getHistory } from '@/lib/storage';

export interface HomePageSectionsProps {
  onOpenChannel?: (artistName: string) => void;
  moodFilter?: string;
}

function getThumbnail(video: VideoType): string {
  return `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`;
}

function HorizontalCard({ 
  video, 
  onPlay, 
  onAddToQueue 
}: { 
  video: VideoType; 
  onPlay: () => void; 
  onAddToQueue: () => void;
}) {
  return (
    <div 
      className="flex-shrink-0 w-48 group cursor-pointer"
      onClick={onPlay}
    >
      <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-secondary">
        <img
          src={getThumbnail(video)}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="w-12 h-12 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100"
          >
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
          </button>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToQueue();
          }}
          className="absolute bottom-2 right-2 p-1.5 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-all hover:bg-background"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <h4 className="font-medium text-sm truncate">{video.title}</h4>
      <p className="text-xs text-muted-foreground truncate">{video.author}</p>
    </div>
  );
}

function SectionRow({
  title,
  icon: Icon,
  videos,
  onPlay,
  onAddToQueue,
  loading
}: {
  title: string;
  icon: React.ElementType;
  videos: VideoType[];
  onPlay: (video: VideoType) => void;
  onAddToQueue: (video: VideoType) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex-shrink-0 w-48">
              <div className="aspect-square rounded-lg bg-secondary/50 animate-pulse mb-2" />
              <div className="h-4 w-3/4 bg-secondary/50 rounded animate-pulse mb-1" />
              <div className="h-3 w-1/2 bg-secondary/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (videos.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
        {videos.map((video) => (
          <HorizontalCard
            key={video.videoId}
            video={video}
            onPlay={() => onPlay(video)}
            onAddToQueue={() => onAddToQueue(video)}
          />
        ))}
      </div>
    </section>
  );
}

// Better search queries for diverse content
const ALBUM_QUERIES = [
  'best albums 2024 full',
  'top album releases music',
  'new album songs',
  'popular album tracks',
  'grammy albums music'
];

const FEATURED_QUERIES = [
  'spotify top 50 songs',
  'billboard hot 100 songs',
  'apple music top songs',
  'viral tiktok songs',
  'trending playlist hits'
];

const VIDEO_QUERIES = [
  'official music video 2024',
  'new music video premiere',
  'best music videos hits',
  'popular artist music video',
  'vevo music video'
];

const NEW_RELEASE_QUERIES = [
  'new music friday',
  'just released songs',
  'new singles 2024',
  'latest music drops',
  'brand new songs today'
];

// Diverse genres for "For You" section
const DIVERSE_GENRES = [
  'pop hits',
  'hip hop rap songs',
  'r&b soul music',
  'rock classics',
  'electronic dance music',
  'indie alternative songs',
  'latin reggaeton',
  'k-pop hits',
  'country music songs',
  'jazz lofi beats'
];

export function HomePageSections({ onOpenChannel, moodFilter }: HomePageSectionsProps) {
  const [albums, setAlbums] = useState<VideoType[]>([]);
  const [featured, setFeatured] = useState<VideoType[]>([]);
  const [musicVideos, setMusicVideos] = useState<VideoType[]>([]);
  const [newReleases, setNewReleases] = useState<VideoType[]>([]);
  const [personalized, setPersonalized] = useState<VideoType[]>([]);
  const [trending, setTrending] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { playTrack, addToQueue } = usePlayerContext();

  useEffect(() => {
    const fetchSections = async () => {
      setLoading(true);
      try {
        // Get user preferences for personalized content
        const preferredArtists = getPreferredArtists();
        const history = getHistory();
        
        // If mood filter is active, search with mood
        const moodPrefix = moodFilter ? `${moodFilter} ` : '';
        
        // Pick random queries for variety
        const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
        
        const albumQuery = moodPrefix + pickRandom(ALBUM_QUERIES);
        const featuredQuery = moodPrefix + pickRandom(FEATURED_QUERIES);
        const videoQuery = moodPrefix + pickRandom(VIDEO_QUERIES);
        const newQuery = moodPrefix + pickRandom(NEW_RELEASE_QUERIES);
        
        // Build DIVERSE "For You" queries - mix genres + user artists
        const forYouQueries: string[] = [];
        
        // Add 2-3 random genres for diversity
        const shuffledGenres = [...DIVERSE_GENRES].sort(() => Math.random() - 0.5);
        forYouQueries.push(...shuffledGenres.slice(0, 3).map(g => moodPrefix + g));
        
        // Add 1-2 preferred artists if available
        if (preferredArtists.length > 0) {
          const shuffledArtists = [...preferredArtists].sort(() => Math.random() - 0.5);
          forYouQueries.push(...shuffledArtists.slice(0, 2).map(a => `${a.name} songs`));
        } else if (history.length > 0) {
          // Use history artists
          const historyArtists = [...new Set(history.slice(0, 10).map(v => v.author))];
          forYouQueries.push(...historyArtists.slice(0, 2).map(a => `${a} music`));
        }
        
        // Trending query
        const trendingQuery = moodPrefix + 'trending songs today viral hits';

        // Fetch all in parallel
        const [albumsRes, featuredRes, videosRes, newRes, trendingRes, ...forYouResults] = await Promise.all([
          searchVideos(albumQuery),
          searchVideos(featuredQuery),
          searchVideos(videoQuery),
          searchVideos(newQuery),
          searchVideos(trendingQuery),
          ...forYouQueries.map(q => searchVideos(q)),
        ]);

        // Filter to music only (1-10 minutes)
        const filterMusic = (videos: VideoType[]) => 
          videos.filter(v => v.lengthSeconds > 60 && v.lengthSeconds < 600);

        // Deduplicate across all sections
        const seenIds = new Set<string>();
        const dedupeAndLimit = (videos: VideoType[], limit: number = 12): VideoType[] => {
          const result: VideoType[] = [];
          for (const v of filterMusic(videos)) {
            if (!seenIds.has(v.videoId)) {
              seenIds.add(v.videoId);
              result.push(v);
              if (result.length >= limit) break;
            }
          }
          return result;
        };

        // Merge "For You" results with diversity
        const forYouMerged: VideoType[] = [];
        const forYouSeenIds = new Set<string>();
        forYouResults.forEach(results => {
          filterMusic(results).forEach(v => {
            if (!forYouSeenIds.has(v.videoId) && forYouMerged.length < 20) {
              forYouSeenIds.add(v.videoId);
              forYouMerged.push(v);
            }
          });
        });
        // Shuffle for variety
        const shuffledForYou = forYouMerged.sort(() => Math.random() - 0.5).slice(0, 12);

        setAlbums(dedupeAndLimit(albumsRes));
        setFeatured(dedupeAndLimit(featuredRes));
        setMusicVideos(dedupeAndLimit(videosRes));
        setNewReleases(dedupeAndLimit(newRes));
        setPersonalized(shuffledForYou);
        setTrending(dedupeAndLimit(trendingRes));
      } catch (error) {
        console.error('Error fetching home sections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, [moodFilter]);

  const handlePlay = (video: VideoType) => {
    playTrack(video);
  };

  const handleAddToQueue = (video: VideoType) => {
    addToQueue(video);
    toast.success('Added to queue');
  };

  return (
    <div className="space-y-8">
      <SectionRow
        title="Trending Now"
        icon={TrendingUp}
        videos={trending}
        onPlay={handlePlay}
        onAddToQueue={handleAddToQueue}
        loading={loading}
      />
      
      <SectionRow
        title="For You"
        icon={Sparkles}
        videos={personalized}
        onPlay={handlePlay}
        onAddToQueue={handleAddToQueue}
        loading={loading}
      />
      
      <SectionRow
        title="Albums for you"
        icon={Disc3}
        videos={albums}
        onPlay={handlePlay}
        onAddToQueue={handleAddToQueue}
        loading={loading}
      />
      
      <SectionRow
        title="Featured playlists"
        icon={Globe}
        videos={featured}
        onPlay={handlePlay}
        onAddToQueue={handleAddToQueue}
        loading={loading}
      />
      
      <SectionRow
        title="Music videos"
        icon={Video}
        videos={musicVideos}
        onPlay={handlePlay}
        onAddToQueue={handleAddToQueue}
        loading={loading}
      />
      
      <SectionRow
        title="New releases"
        icon={Music2}
        videos={newReleases}
        onPlay={handlePlay}
        onAddToQueue={handleAddToQueue}
        loading={loading}
      />
    </div>
  );
}
