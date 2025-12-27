import { Video } from '@/types/music';
import { MusicCard } from './MusicCard';
import { PlayCircle } from 'lucide-react';
import { usePlayerContext } from '@/context/PlayerContext';

interface QuickPicksProps {
  videos: Video[];
}

export function QuickPicks({ videos }: QuickPicksProps) {
  const { playTrack } = usePlayerContext();
  const displayVideos = videos.slice(0, 8);

  const handlePlayAll = () => {
    if (displayVideos.length > 0) {
      playTrack(displayVideos[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Quick picks</h2>
        <button 
          onClick={handlePlayAll}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-accent rounded-full text-sm font-medium transition-colors"
        >
          <PlayCircle className="w-4 h-4" />
          Play all
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {displayVideos.map((video) => (
          <MusicCard key={video.videoId} video={video} variant="compact" />
        ))}
      </div>
    </div>
  );
}
