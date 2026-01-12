import { useState, useEffect } from 'react';
import { Play, Plus, Disc3, Music2, Video, Sparkles } from 'lucide-react';
import { Video as VideoType } from '@/types/music';
import { searchVideos } from '@/lib/api';
import { usePlayerContext } from '@/context/PlayerContext';
import { toast } from 'sonner';

interface HomePageSectionsProps {
  onOpenChannel?: (artistName: string) => void;
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

export function HomePageSections({ onOpenChannel }: HomePageSectionsProps) {
  const [albums, setAlbums] = useState<VideoType[]>([]);
  const [featured, setFeatured] = useState<VideoType[]>([]);
  const [musicVideos, setMusicVideos] = useState<VideoType[]>([]);
  const [newReleases, setNewReleases] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { playTrack, addToQueue } = usePlayerContext();

  useEffect(() => {
    const fetchSections = async () => {
      setLoading(true);
      try {
        // Fetch different content types in parallel
        const [albumsRes, featuredRes, videosRes, newRes] = await Promise.all([
          searchVideos('top albums 2024 music'),
          searchVideos('featured playlist hits music'),
          searchVideos('official music video 2024'),
          searchVideos('new music releases 2024'),
        ]);

        // Filter to music only (under 10 minutes)
        const filterMusic = (videos: VideoType[]) => 
          videos.filter(v => v.lengthSeconds > 60 && v.lengthSeconds < 600);

        setAlbums(filterMusic(albumsRes).slice(0, 10));
        setFeatured(filterMusic(featuredRes).slice(0, 10));
        setMusicVideos(filterMusic(videosRes).slice(0, 10));
        setNewReleases(filterMusic(newRes).slice(0, 10));
      } catch (error) {
        console.error('Error fetching home sections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, []);

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
        title="Albums for you"
        icon={Disc3}
        videos={albums}
        onPlay={handlePlay}
        onAddToQueue={handleAddToQueue}
        loading={loading}
      />
      
      <SectionRow
        title="Featured playlists"
        icon={Sparkles}
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
