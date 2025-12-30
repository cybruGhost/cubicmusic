import { Video } from '@/types/music';
import { MusicCard } from './MusicCard';
import { Loader2 } from 'lucide-react';

interface MusicGridProps {
  videos: Video[];
  loading?: boolean;
  title?: string;
  onOpenChannel?: (artistName: string) => void;
}

export function MusicGrid({ videos, loading, title, onOpenChannel }: MusicGridProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {title && (
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        )}
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (videos.length === 0 && !loading) {
    return (
      <div className="space-y-4">
        {title && (
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        )}
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground">No results found</p>
          <p className="text-sm text-muted-foreground mt-1">Try searching for something else</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {videos.map((video) => (
          <MusicCard key={video.videoId} video={video} onOpenChannel={onOpenChannel} />
        ))}
      </div>
    </div>
  );
}
