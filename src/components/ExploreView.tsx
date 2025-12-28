import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Disc3, Video, Users, Sparkles, Music2 } from 'lucide-react';
import { MusicCard } from './MusicCard';
import { useSearch } from '@/hooks/useSearch';
import { Video as VideoType } from '@/types/music';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface Category {
  id: string;
  label: string;
  icon: React.ElementType;
  query: string;
}

const categories: Category[] = [
  { id: 'new', label: 'New Releases', icon: Sparkles, query: 'new music 2024' },
  { id: 'charts', label: 'Charts', icon: TrendingUp, query: 'top hits 2024' },
  { id: 'videos', label: 'Music Videos', icon: Video, query: 'official music video' },
  { id: 'trending', label: 'Trending', icon: TrendingUp, query: 'trending songs' },
  { id: 'community', label: 'Community Playlists', icon: Users, query: 'popular playlist mix' },
];

export function ExploreView() {
  const [activeCategory, setActiveCategory] = useState('new');
  const [categoryData, setCategoryData] = useState<Record<string, VideoType[]>>({});
  const { videos, loading, search } = useSearch();

  useEffect(() => {
    const category = categories.find(c => c.id === activeCategory);
    if (category) {
      search(category.query);
    }
  }, [activeCategory, search]);

  useEffect(() => {
    if (videos.length > 0) {
      setCategoryData(prev => ({
        ...prev,
        [activeCategory]: videos
      }));
    }
  }, [videos, activeCategory]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Explore</h1>
        <p className="text-muted-foreground">Discover new music and trending tracks</p>
      </div>

      {/* Category Tabs */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            
            return (
              <motion.button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                whileTap={{ scale: 0.95 }}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                  ${isActive 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                    : 'bg-secondary/50 text-foreground hover:bg-secondary'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {category.label}
              </motion.button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Featured Section */}
      {videos.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            {categories.find(c => c.id === activeCategory)?.icon && (
              <span className="text-primary">
                {(() => {
                  const Icon = categories.find(c => c.id === activeCategory)?.icon || Music2;
                  return <Icon className="w-5 h-5" />;
                })()}
              </span>
            )}
            {categories.find(c => c.id === activeCategory)?.label}
          </h2>
          
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {videos.map((video) => (
                <MusicCard key={video.videoId} video={video} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Genre Tags */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Browse by Genre</h2>
        <div className="flex flex-wrap gap-2">
          {['Pop', 'Hip-Hop', 'R&B', 'Rock', 'Electronic', 'Jazz', 'Classical', 'Country', 'Latin', 'K-Pop', 'Indie', 'Metal'].map((genre) => (
            <button
              key={genre}
              onClick={() => {
                setActiveCategory('new');
                search(`${genre} music 2024`);
              }}
              className="px-4 py-2 rounded-full bg-secondary/50 text-sm font-medium hover:bg-secondary transition-colors"
            >
              {genre}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
